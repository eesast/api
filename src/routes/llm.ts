import express from "express";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import {
  get_llm_usage_by_uuid,
  get_user_llm_usage,
  init_user_llm_usage,
  get_llm_model_config,
  log_access_key_usage,
  check_access_key_usage,
  update_llm_usage_by_uuid,
  update_user_llm_usage,
} from "../hasura/llm";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

// Configuration
const PUBLIC_KEY_PATH =
  process.env.LLM_PUBLIC_KEY_PATH ||
  path.join(__dirname, "../../public_key.pem");
const JWT_SECRET = process.env.LLM_JWT_SECRET || "eesast_llm_session_secret";
const SESSION_EXPIRY = "12h"; // Session token expiry

type LlmUsageSource = "legacy_access_key" | "authenticated_user";

interface LlmUserSession {
  subject: string;
  email?: string;
  role?: string;
  usageSource: LlmUsageSource;
}

interface ActiveChatRequest {
  requestId: symbol;
  expiresAt: number;
}

const ACCESS_KEY_DEFAULT_TTL_SECONDS = 3600 * 24 * 7;
const ACTIVE_CHAT_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 3000;

const usedAccessKeys = new Map<string, number>();
const minSessionIatBySubject = new Map<string, number>();
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

const getAccessKeyTtlSeconds = (exp?: number) => {
  return exp ? exp - Math.floor(Date.now() / 1000) : ACCESS_KEY_DEFAULT_TTL_SECONDS;
};

const isAccessKeyMarkedUsed = (jti: string) => {
  const now = Date.now();
  cleanupExpiredNumberMap(usedAccessKeys, now);
  const expiresAt = usedAccessKeys.get(jti);
  return expiresAt !== undefined && expiresAt > now;
};

const markAccessKeyUsed = (jti: string, ttlSeconds: number) => {
  if (ttlSeconds > 0) {
    usedAccessKeys.set(jti, Date.now() + ttlSeconds * 1000);
  }
};

const getUsageSourceFromToken = (decoded: any): LlmUsageSource => {
  if (decoded.usageSource === "authenticated_user") {
    return "authenticated_user";
  }
  return "legacy_access_key";
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
  if (user.usageSource === "authenticated_user") {
    const dbUsage = await get_llm_usage_by_uuid(user.subject);
    if (!dbUsage) {
      throw new Error("LLM_USAGE_NOT_FOUND");
    }

    const tokenLimit = dbUsage.token_limit || 0;
    return {
      totalTokensUsed: Number(dbUsage.total_tokens_used || 0),
      tokenLimit: tokenLimit > 0 ? Number(tokenLimit) : getGlobalQuota(),
    };
  }

  const dbUser = await get_user_llm_usage(user.subject);
  if (!dbUser) {
    throw new Error("LLM_USAGE_NOT_FOUND");
  }

  const tokenLimit = dbUser.token_limit || 0;
  return {
    totalTokensUsed: Number(dbUser.total_tokens_used || 0),
    tokenLimit: tokenLimit > 0 ? Number(tokenLimit) : getGlobalQuota(),
  };
};

const updateUsage = async (user: LlmUserSession, tokensToAdd: number) => {
  if (tokensToAdd <= 0) return;

  if (user.usageSource === "authenticated_user") {
    await update_llm_usage_by_uuid(user.subject, tokensToAdd);
    return;
  }

  await update_user_llm_usage(user.subject, tokensToAdd);
};

// Helper to read public key
const getPublicKey = () => {
  try {
    if (process.env.LLM_PUBLIC_KEY) {
      return process.env.LLM_PUBLIC_KEY.replace(/\\n/g, "\n");
    }
    if (fs.existsSync(PUBLIC_KEY_PATH)) {
      return fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
    }
    console.warn("LLM Public Key not found at " + PUBLIC_KEY_PATH);
    return null;
  } catch (e) {
    console.error("Error reading public key:", e);
    return null;
  }
};

// Middleware to verify LLM Session Token
const verifySession = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const subject = decoded.sub;
    const iat = decoded.iat;

    // Check if token is invalidated by a newer login
    const minIat = minSessionIatBySubject.get(subject);
    if (minIat && iat && iat < minIat) {
      return res
        .status(401)
        .json({ error: "Session expired (logged in elsewhere)" });
    }

    // Attach user info to request
    (req as any).llmUser = {
      subject,
      studentNo: subject,
      email: decoded.email,
      role: decoded.role,
      usageSource: getUsageSourceFromToken(decoded),
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid session token" });
  }
};

// 1. Verify Access Key and Exchange for Session Token
router.post("/verify", async (req, res) => {
  const { accessKey } = req.body;

  if (!accessKey) {
    return res.status(400).json({ error: "Access Key is required" });
  }

  const publicKey = getPublicKey();
  if (!publicKey) {
    return res
      .status(500)
      .json({ error: "Server configuration error (Public Key missing)" });
  }

  try {
    // Verify RSA signature
    const decoded = jwt.verify(accessKey, publicKey, {
      algorithms: ["RS256"],
    }) as any;
    const { sub: studentNo, jti, exp, email, quota } = decoded;

    const ttl = getAccessKeyTtlSeconds(exp);
    if (isAccessKeyMarkedUsed(jti)) {
      return res
        .status(403)
        .json({ error: "Access Key has already been used" });
    }

    // Check Replay Attack (DB - Persistence)
    const isUsedDB = await check_access_key_usage(jti);
    if (isUsedDB) {
      markAccessKeyUsed(jti, ttl);
      return res
        .status(403)
        .json({ error: "Access Key has already been used" });
    }

    markAccessKeyUsed(jti, ttl);

    // Log Access Key usage to DB
    try {
      await log_access_key_usage(studentNo, jti, email);
    } catch (e) {
      console.error("Failed to log access key usage:", e);
      // Don't block login if logging fails, but it's good to know
    }

    // Invalidate old sessions
    const now = Math.floor(Date.now() / 1000);
    minSessionIatBySubject.set(studentNo, now);

    // Initialize Quota if not exists
    // We use '0' in DB to indicate "Follow Global Limit"

    // Try to get from DB first
    let dbUser = await get_user_llm_usage(studentNo);

    if (!dbUser) {
      // Create in DB if not exists
      // If Access Key has specific quota, use it. Otherwise use 0 (Global).
      const limit = quota || 0;
      dbUser = await init_user_llm_usage(studentNo, limit, email);
    } else if (email && dbUser.email !== email) {
      // Update email if it's different (and we have a new one)
      // We can reuse init_user_llm_usage because of on_conflict update_columns: [email]
      // But we should be careful not to reset token_limit if we don't want to.
      // However, init_user_llm_usage currently takes token_limit.
      // Let's just call it with the existing limit to update the email.
      dbUser = await init_user_llm_usage(studentNo, dbUser.token_limit, email);
    }

    const dbLimit = dbUser?.token_limit || 0;

    // Issue Session Token
    const sessionToken = jwt.sign(
      {
        sub: studentNo,
        email: email,
        role: "student",
        type: "llm_session",
        usageSource: "legacy_access_key",
      },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY },
    );

    res.json({
      token: sessionToken,
      user: {
        studentNo,
        email,
      },
      quota: {
        tokenLimit: dbLimit,
        totalTokensUsed: dbUser?.total_tokens_used || 0,
      },
    });
  } catch (err) {
    console.error("Access Key Verification Failed:", err);
    return res.status(403).json({ error: "Invalid or expired Access Key" });
  }
});

router.post("/verify_new", authenticate(), async (req, res) => {
  try {
    const uuid: string | undefined = req.auth.user.uuid;
    const email: string | undefined = req.auth.user.email;
    const role: string | undefined = req.auth.user.role;

    if (!uuid) {
      return res.status(400).json({ error: "Missing uuid in auth user" });
    }

    // Invalidate old sessions for this uuid
    const now = Math.floor(Date.now() / 1000);
    minSessionIatBySubject.set(uuid, now);

    // Check llm_usage row by authenticated uuid.
    const dbUsage = await get_llm_usage_by_uuid(uuid);
    if (!dbUsage) {
      return res.status(401).json({
        error: "No llm_usage record found for authenticated uuid",
      });
    }

    const dbLimit = dbUsage.token_limit || 0;

    // Issue LLM session token using authenticated identity
    const sessionToken = jwt.sign(
      {
        sub: uuid,
        email: email,
        role: role,
        type: "llm_session",
        usageSource: "authenticated_user",
      },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY },
    );

    return res.json({
      token: sessionToken,
      user: {
        uuid,
        email,
        role,
      },
      quota: {
        tokenLimit: dbLimit,
        totalTokensUsed: dbUsage.total_tokens_used || 0,
      },
    });
  } catch (err: any) {
    console.error("verify_new failed:", err);
    return res.status(500).json({
      error: "Failed to verify authenticated user for LLM",
      details: err?.message,
    });
  }
});

// 2. Chat Endpoint
router.post("/chat", verifySession, async (req, res) => {
  const { messages, model } = req.body;
  const user = (req as any).llmUser as LlmUserSession;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
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
    const { totalTokensUsed, tokenLimit } = await getUsageAndLimit(user);

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
      res.status(401).json({ error: "LLM usage record not found." });
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
