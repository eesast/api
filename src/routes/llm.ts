import express from "express";
import OpenAI from "openai";
import {
  get_llm_usage_by_uuid,
  get_llm_model_config,
  update_llm_usage_by_uuid,
} from "../hasura/llm";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

interface LlmUserSession {
  subject: string;
}

interface ActiveChatRequest {
  requestId: symbol;
  expiresAt: number;
}

const ACTIVE_CHAT_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 3000;
const LLM_ALLOWED_ROLES = ["student", "teacher", "counselor", "user", "root"];

const activeChatBySubject = new Map<string, ActiveChatRequest>();
const rateLimitedUntilBySubject = new Map<string, number>();

const getGlobalQuota = () => {
  return parseInt(process.env.LLM_DEFAULT_LIMIT || "5000000", 10);
};

const cleanupExpiredNumberMap = (map: Map<string, number>, now = Date.now()) => {
  for (const [key, expiresAt] of map.entries()) {
    if (expiresAt <= now) {
      map.delete(key);
    }
  }
};

const acquireChatSlot = (subject: string) => {
  const now = Date.now();
  const activeRequest = activeChatBySubject.get(subject);
  if (activeRequest && activeRequest.expiresAt > now) {
    return null;
  }

  const requestId = Symbol(subject);
  activeChatBySubject.set(subject, {
    requestId,
    expiresAt: now + ACTIVE_CHAT_TTL_MS,
  });
  return requestId;
};

const releaseChatSlot = (subject: string, requestId: symbol | null) => {
  if (!requestId) return;

  const activeRequest = activeChatBySubject.get(subject);
  if (activeRequest?.requestId === requestId) {
    activeChatBySubject.delete(subject);
  }
};

const isRateLimited = (subject: string) => {
  const now = Date.now();
  cleanupExpiredNumberMap(rateLimitedUntilBySubject, now);
  const limitedUntil = rateLimitedUntilBySubject.get(subject);
  return limitedUntil !== undefined && limitedUntil > now;
};

const markRateLimited = (subject: string) => {
  rateLimitedUntilBySubject.set(subject, Date.now() + RATE_LIMIT_MS);
};

const getUsageAndLimit = async (user: LlmUserSession) => {
  const dbUsage = await get_llm_usage_by_uuid(user.subject);
  if (!dbUsage) {
    throw new Error("LLM_USAGE_NOT_FOUND");
  }

  const tokenLimit = dbUsage.token_limit || 0;
  return {
    totalTokensUsed: Number(dbUsage.total_tokens_used || 0),
    tokenLimit: tokenLimit > 0 ? Number(tokenLimit) : getGlobalQuota(),
  };
};

const updateUsage = async (user: LlmUserSession, tokensToAdd: number) => {
  if (tokensToAdd <= 0) return;

  await update_llm_usage_by_uuid(user.subject, tokensToAdd);
};

router.post("/status", authenticate(LLM_ALLOWED_ROLES), async (req, res) => {
  try {
    const uuid = req.auth.user.uuid;
    if (!uuid) {
      return res.status(400).json({ error: "Missing uuid in auth user" });
    }

    const dbUsage = await get_llm_usage_by_uuid(uuid);
    if (!dbUsage) {
      return res.status(403).json({
        error: "LLM access is not enabled for this user.",
      });
    }

    const tokenLimit = dbUsage.token_limit || 0;
    return res.json({
      user: {
        uuid,
        email: req.auth.user.email,
        role: req.auth.user.role,
      },
      quota: {
        tokenLimit,
        totalTokensUsed: dbUsage.total_tokens_used || 0,
      },
    });
  } catch (err: any) {
    console.error("llm status failed:", err);
    return res.status(500).json({
      error: "Failed to get LLM status",
      details: err?.message,
    });
  }
});

// Chat Endpoint
router.post("/chat", authenticate(LLM_ALLOWED_ROLES), async (req, res) => {
  const { messages, model } = req.body;
  const uuid = req.auth.user.uuid;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  if (!uuid) {
    return res.status(400).json({ error: "Missing uuid in auth user" });
  }

  const user: LlmUserSession = { subject: uuid };
  let quota: Awaited<ReturnType<typeof getUsageAndLimit>>;

  try {
    quota = await getUsageAndLimit(user);
  } catch (error: any) {
    if (error.message === "LLM_USAGE_NOT_FOUND") {
      return res.status(403).json({
        error: "LLM access is not enabled for this user.",
      });
    }

    console.error("Failed to check LLM access:", error);
    return res.status(500).json({
      error: "Failed to check LLM access",
      details: error.message,
    });
  }

  // Concurrency Control
  const activeRequestId = acquireChatSlot(user.subject);
  if (!activeRequestId) {
    return res.status(429).json({
      error:
        "Too many concurrent requests. Please wait for the previous request to finish.",
    });
  }

  // Rate Limiting (e.g., 1 request per 3 seconds)
  if (isRateLimited(user.subject)) {
    releaseChatSlot(user.subject, activeRequestId);
    return res
      .status(429)
      .json({ error: "Request too frequent. Please wait a few seconds." });
  }
  markRateLimited(user.subject);

  // Setup AbortController for client disconnect
  const controller = new AbortController();
  req.on("close", () => {
    controller.abort();
  });

  try {
    // Quota Check
    const { totalTokensUsed, tokenLimit } = quota;

    if (totalTokensUsed >= tokenLimit) {
      throw new Error("QUOTA_EXCEEDED");
    }

    let apiKey = process.env.LLM_API_KEY;
    let baseURL = process.env.LLM_API_URL;

    // Special configuration for Qwen models
    if (
      model &&
      (model.toLowerCase().includes("qwen") ||
        model.toLowerCase().includes("qwq"))
    ) {
      if (process.env.QWEN_API_KEY) {
        apiKey = process.env.QWEN_API_KEY;
        if (process.env.QWEN_API_URL) {
          baseURL = process.env.QWEN_API_URL;
        }
      }
    }

    if (!apiKey) {
      // Mock response for testing
      res.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Mock: Backend configured but no API Key.",
            },
          },
        ],
      });
      return;
    }

    // Check for deep thinking configuration
    let enableThinking = false;
    try {
      const modelConfig = await get_llm_model_config(model || "gpt-3.5-turbo");
      if (modelConfig && modelConfig.deepthinkingmodel === "enabled") {
        enableThinking = true;
      }
    } catch (e) {
      console.warn("Failed to fetch model config:", e);
    }

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const requestOptions: any = {
      model: model || "gpt-3.5-turbo",
      messages: messages,
      stream: true,
      stream_options: { include_usage: true }, // Request usage stats
    };

    if (enableThinking) {
      requestOptions.enable_thinking = true;
    }
    // console.log("LLM Request Options:", requestOptions);
    // console.log(`Base URL: ${baseURL}`);
    const stream = (await client.chat.completions.create(requestOptions, {
      signal: controller.signal,
    })) as any;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let totalTokens = 0;

    for await (const chunk of stream) {
      // Handle usage if provided in the last chunk
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens;
      }

      const delta = chunk.choices[0]?.delta;
      if (delta) {
        const reasoning = delta.reasoning_content;
        const content = delta.content;
        if (content || reasoning) {
          res.write(`data: ${JSON.stringify({ content, reasoning })}\n\n`);
        }
      }
    }

    // If usage was not returned by stream (some providers don't), estimate it
    if (totalTokens === 0) {
      // Rough estimation: 1 char ~= 0.5 token (very rough, but better than nothing)
      // In production, use a tokenizer library like tiktoken
      const inputLen = messages.reduce(
        (acc: number, m: any) => acc + (m.content?.length || 0),
        0,
      );
      // We don't have the full output content easily here without buffering,
      // but we can assume some average or just count input for now if stream usage is missing.
      // For now, let's just count input * 1.5 as a fallback
      totalTokens = Math.ceil(inputLen * 0.7);
    }

    await updateUsage(user, totalTokens);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED") {
      res
        .status(402)
        .json({ error: "Token quota exceeded. Please contact admin." });
    } else if (error.message === "LLM_USAGE_NOT_FOUND") {
      res.status(403).json({ error: "LLM access is not enabled for this user." });
    } else {
      console.error("LLM API Error:", error);
      // If headers sent, we can't send JSON error, just end stream
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`,
        );
        res.end();
      } else {
        res.status(500).json({
          error: "Failed to fetch from LLM provider",
          details: error.message,
        });
      }
    }
  } finally {
    // Release Concurrency Lock
    releaseChatSlot(user.subject, activeRequestId);
  }
});

export default router;
