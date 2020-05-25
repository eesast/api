import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";
import recaptcha from "../middlewares/recaptcha";
import { sendEmail } from "../helpers";
import {
  verifyEmailTemplate,
  resetPasswordTemplate,
} from "../helpers/htmlTemplates";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

router.post("/", recaptcha, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await new User({
      email,
      password: hash,
      role: "user",
    }).save();

    try {
      const token = jwt.sign(
        {
          email,
          type: "regular",
          action: "verifyEmail",
        },
        process.env.SECRET!,
        {
          expiresIn: "15m",
        }
      );
      await sendEmail(
        email,
        "验证您的邮箱",
        verifyEmailTemplate(
          `${process.env.EESAST_URL}/verify?type=regular&token=${token}`
        )
      );
    } catch (error) {
      console.error(error);
    }

    res.status(201).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing credentials");
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).end();
    }

    if (!user.emailVerified) {
      return res.status(401).end("401 Unauthorized: Email not verified");
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": [user.role],
          "x-hasura-default-role": user.role,
          "x-hasura-user-id": user.id.toString(),
        },
      },
      process.env.SECRET!,
      {
        expiresIn: "2h",
      }
    );
    return res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

router.post("/verify", async (req, res) => {
  const { action, type } = req.body;

  if (action === "request") {
    await new Promise((resolve) => recaptcha(req, res, resolve));

    if (type === "regular") {
      const { email } = req.body;
      try {
        const token = jwt.sign(
          {
            email,
            type: "regular",
            action: "verifyEmail",
          },
          process.env.SECRET!,
          {
            expiresIn: "15m",
          }
        );
        await sendEmail(
          email,
          "验证您的邮箱",
          verifyEmailTemplate(
            `${process.env.EESAST_URL}/verify?type=regular&token=${token}`
          )
        );
      } catch (error) {
        console.error(error);
      }
      return res.status(200).end();
    } else if (type === "tsinghua") {
      await new Promise((resolve) => authenticate()(req, res, resolve));

      const { tsinghuaEmail } = req.body;
      const token = jwt.sign(
        {
          email: req.auth.user.email,
          type: "tsinghua",
          tsinghuaEmail,
          action: "verifyEmail",
        },
        process.env.SECRET!,
        {
          expiresIn: "15m",
        }
      );
      await sendEmail(
        tsinghuaEmail,
        "验证您的清华邮箱",
        verifyEmailTemplate(
          `${process.env.EESAST_URL}/verify?type=tsinghua&token=${token}`
        )
      );
    } else {
      return res.status(422).send("422 Unprocessable Entity: Wrong action");
    }
  } else if (action === "fulfill") {
    const { token } = req.body;

    jwt.verify(token as string, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      const payload = decoded as {
        email: string;
        type: string;
        tsinghuaEmail: string;
        action: string;
      };
      if (payload.action !== "verifyEmail") {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      try {
        const user = await User.findOne({ email: payload.email });

        if (!user) {
          return res.status(500).end();
        }

        if (type === "tsinghua") {
          if (user.role === "user") {
            user.update({ role: "student" }, (err) => {
              if (err) {
                console.error(err);
                res.status(500).end();
              } else {
                return res.status(200).end();
              }
            });
          } else {
            return res.status(200).end();
          }
        } else if (type === "regular") {
          user.update({ emailVerified: true }, (err) => {
            if (err) {
              console.error(err);
              return res.status(500).end();
            } else {
              return res.status(200).end();
            }
          });
        } else {
          return res.status(422).send("422 Unprocessable Entity: Wrong action");
        }
      } catch (err) {
        console.error(err);
        res.status(500).end();
      }
    });
  } else {
    return res.status(422).send("422 Unprocessable Entity: Wrong action");
  }
});

router.post("/reset", async (req, res) => {
  const { action } = req.body;

  if (action === "request") {
    await new Promise((resolve) => recaptcha(req, res, resolve));

    const { email } = req.body;
    const token = jwt.sign(
      {
        email,
        action: "resetPassword",
      },
      process.env.SECRET!,
      {
        expiresIn: "15m",
      }
    );
    await sendEmail(
      email,
      "重置您的密码",
      resetPasswordTemplate(`${process.env.EESAST_URL}/reset?token=${token}`)
    );
  } else if (action === "fulfill") {
    const { token } = req.body;

    jwt.verify(token as string, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      const payload = decoded as { email: string; action: string };
      if (payload.action !== "resetPassword") {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      const email = payload.email;
      const { password } = req.body;

      try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        const user = await User.findOne({ email });

        if (!user) {
          return res.status(500).end();
        }

        user.update({ password: hash }, (err) => {
          if (err) {
            console.error(err);
            res.status(500).end();
          } else {
            return res.status(204).end();
          }
        });
      } catch (err) {
        console.error(err);
        res.status(500).end();
      }
    });
  } else {
    return res.status(422).send("422 Unprocessable Entity: Wrong action");
  }
});

export default router;
