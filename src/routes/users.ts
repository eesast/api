import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import Email from "../models/email";
import User from "../models/user";
// import recaptcha from "../middlewares/recaptcha";
import { sendEmail } from "../helpers/email";
import {
  verifyEmailTemplate,
  resetPasswordTemplate,
} from "../helpers/htmlTemplates";
import authenticate, { JwtPayload } from "../middlewares/authenticate";
import { validateEmail, validatePassword } from "../helpers/validate";
import hasura from "../middlewares/hasura";
import type { MongoError } from "mongodb";
import { gql } from "graphql-request";
import { client } from "..";

const router = express.Router();

router.put("/delete", async(req, res) => {
  try{
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as JwtPayload;
      const id = req.body._id, user = payload.email;
      if(payload.role!=='root' && id !== payload._id){
        return res.status(401).send()
          .send(`401 Unauthorized: No authority to delete user ${user} or ID not match.`);
      }
      const num = await User.count({_id: id});
      if(num !== 0){
        if((await User.deleteOne({_id: id}))){
          console.log("Delete Successfully.");
          return res.status(200).send(`Delete user ${user} successfully.`);
        }
        else
          return res.status(500).send("Error: Found multiple users in database.");
      }
      else
        return res.status(501).send(`Error: User ${user} not found in database`);
    });
  } catch(err){
    return res.send(err);
  }
})

// router.post("/", recaptcha, async (req, res) => {
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  if (!validateEmail(email)) {
    return res.status(422).send("422 Unprocessable Entity: Invalid email");
  }

  if (!validatePassword(password)) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Password does not match pattern");
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

    if ((err as MongoError).code === 11000) {
      return res.status(409).send("409 Conflict: User already exists");
    } else {
      return res.status(500).end();
    }
  }
});

router.put("/", authenticate(), async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing new password");
  }

  if (!validatePassword(password)) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Password does not match pattern");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const email = req.auth.user.email;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    user.update({ password: hash }, null, (err) => {
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
    const user: any = await User.findOne({ email });

    if (!user) {
      // 没有 recaptcha 保护，不提示“用户不存在”
      return res.status(401).end();
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
      expiresIn: "24h",
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
    // await new Promise((resolve) => recaptcha(req, res, resolve));

    if (type === "regular") {
      const { email } = req.body;

      try {
        const user = await User.findOne({ email });

        if (!user) {
          return res.status(404).send("404 Not Found: User does not exist");
        }

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
        if (!validateEmail(tsinghuaEmail)) {
          return res
            .status(422)
            .send("422 Unprocessable Entity: Invalid Tsinghua email");
        }
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
          return res.status(404).send("404 Not Found: User does not exist");
        }

        if (type === "tsinghua") {
          if (user.role === "user") {
            const email = await Email.findOne({ email: payload.tsinghuaEmail });
            const role = email ? "EEsenior" : "student";

            try {
              user.update(
                { role, tsinghuaEmail: payload.tsinghuaEmail },
                null,
                (err) => {
                  if (err) {
                    console.error(err);
                    return res.status(500).end();
                  } else {
                    return res.status(200).end();
                  }
                }
              );
            } catch (e) {
              if ((e as MongoError).code === 11000) {
                return res
                  .status(409)
                  .send(
                    "409 Conflict: Tsinghua email has already been associated with another user"
                  );
              }
            }
          } else {
            return res.status(200).end();
          }
        } else if (type === "regular") {
          await client.request(
            gql`
              mutation InsertUser($_id: String!) {
                insert_user_one(object: {_id: $_id}) {
                  _id
                }
              }
            `,
            { _id: user._id }
          );

          user.update({ emailVerified: true }, null, (err) => {
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
    // await new Promise((resolve) => recaptcha(req, res, resolve));

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

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

      if (!validatePassword(password)) {
        return res
          .status(422)
          .send("422 Unprocessable Entity: Password does not match pattern");
      }

      try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        const user = await User.findOne({ email });

        if (!user) {
          return res.status(404).send("404 Not Found: User does not exist");
        }

        user.update({ password: hash }, null, (err) => {
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
    const usersByRole = await client.request(
      gql`
        query GetUsersByIds($ids: [String!]) {
          user(where: {_id: {_in: $ids}}) {
            _id
            name
            department
          }
        }
      `,
      { ids: users.map((u) => u._id) }
    )
    if (usersByRole?.user) {
      return res.status(200).json(usersByRole?.user);
    } else {
      console.error(usersByRole?.errors);
      return res.status(500).end();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

router.put("/role", authenticate(["root"]), async (req, res) => {
  const { _ids, role } = req.body;

  try {
    await User.updateMany(
      { _id: { $in: _ids } },
      { $set: { role: role } },
      (err: any) => {
        if (err) {
          console.error(err);
          return res.status(500).end();
        } else {
          return res.status(200).end();
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

router.put("/role/:objectId", authenticate(["root"]), async (req, res) => {
  const { role } = req.body;

  try {
    await User.findByIdAndUpdate(
      req.params.objectId,
      { $set: { role: role } },
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).end();
        } else {
          return res.status(200).end();
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

router.post("/details", authenticate(["root"]), async (req, res) => {
  const { tsinghuaEmail, email } = req.body;

  if (!tsinghuaEmail && !email) {
    return res.status(422).send("Missing email");
  }

  try {
    const user = tsinghuaEmail
      ? await User.findOne({ tsinghuaEmail: tsinghuaEmail }, "-__v -password")
      : await User.findOne({ email: email }, "-__v -password");

    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

export default router;
