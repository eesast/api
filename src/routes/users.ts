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
import authenticate, { JwtPayload } from "../middlewares/authenticate";
import IsEmail from "isemail";
import fetch from "node-fetch";
import hasura from "../middlewares/hasura";

const router = express.Router();

router.post("/", recaptcha, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  if (!IsEmail.validate(email)) {
    return res.status(422).send("422 Unprocessable Entity: Invalid email");
  }

  if (password.length < 12) {
    return res.status(422).send("422 Unprocessable Entity: Password too short");
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
      // email verification can be requested later
      console.error(error);
    }

    return res.status(201).end();
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

router.put("/", authenticate(), async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing new password");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const email = req.auth.user.email;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(500).end();
    }

    user.update({ password: hash }, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).end();
      } else {
        return res.status(204).end();
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).end();
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

    if (user.role !== "teacher" && !user.emailVerified) {
      return res.status(401).send("401 Unauthorized: Email not verified");
    }

    const payload: JwtPayload = {
      _id: user._id,
      email: user.email,
      role: user.role,
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": [user.role],
        "x-hasura-default-role": user.role,
        "x-hasura-user-id": user._id,
      },
    };
    const token = jwt.sign(payload, process.env.SECRET!, {
      expiresIn: "12h",
    });
    return res
      .status(200)
      .json({ _id: user._id, email: user.email, role: user.role, token });
  } catch (err) {
    console.error(err);
    return res.status(500).end();
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
        return res.status(200).end();
      } catch (error) {
        console.error(error);
        return res.status(500).end();
      }
    } else if (type === "tsinghua") {
      // must provide token to know which account to verify for
      await new Promise((resolve) => authenticate()(req, res, resolve));

      try {
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
        return res.status(200).end();
      } catch (error) {
        console.error(error);
        return res.status(500).end();
      }
    } else {
      return res.status(422).send("422 Unprocessable Entity: Wrong type");
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
                return res.status(500).end();
              } else {
                return res.status(200).end();
              }
            });
          } else {
            return res.status(200).end();
          }
        } else if (type === "regular") {
          await fetch(`${process.env.API_URL}/v1/graphql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
            },
            body: JSON.stringify({
              query: `
                mutation InsertUser($_id: String!) {
                  insert_user_one(object: {_id: $_id}) {
                    _id
                  }
                }
              `,
              variables: {
                _id: user._id,
              },
            }),
          });

          user.update({ emailVerified: true }, (err) => {
            if (err) {
              console.error(err);
              return res.status(500).end();
            } else {
              return res.status(200).end();
            }
          });
        } else {
          return res.status(422).send("422 Unprocessable Entity: Wrong type");
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
    return res.status(200).end();
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

      if (!password) {
        return res
          .status(422)
          .send("422 Unprocessable Entity: Missing new password");
      }

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
            return res.status(500).end();
          } else {
            return res.status(204).end();
          }
        });
      } catch (err) {
        console.error(err);
        return res.status(500).end();
      }
    });
  } else {
    return res.status(422).send("422 Unprocessable Entity: Wrong action");
  }
});

router.post("/actions/user_by_role", hasura, async (req, res) => {
  const { role } = req.body.input;

  if (role !== "teacher") {
    return res.status(403).json({
      message: "403 Forbidden: Selection by this role not allowed",
      code: "403",
    });
  }

  try {
    const users = await User.find({ role });

    const response = await fetch(`${process.env.API_URL}/v1/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetUsersByIds($ids: [String!]) {
            user(where: {_id: {_in: $ids}}) {
              _id
              name
              department
            }
          }
        `,
        variables: {
          ids: users.map((u) => u._id),
        },
      }),
    });

    const usersByRole = await response.json();

    if (usersByRole?.data?.user) {
      return res.status(200).json(usersByRole?.data?.user);
    } else {
      console.error(usersByRole?.errors);
      return res.status(500).end();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

export default router;
