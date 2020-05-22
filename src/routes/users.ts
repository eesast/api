import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";
import recaptcha from "../middlewares/recaptcha";

const router = express.Router();

/**
 * Register new user
 */
router.post("/", recaptcha, async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await new User({
      id,
      password: hash,
      role: "user",
    }).save();

    res.status(201).end();
  } catch (err) {
    res.status(500).end();
  }
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing credentials");
  }

  try {
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (valid) {
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
      res.status(200).json({ token });
    } else {
      res.status(401).end();
    }
  } catch (err) {
    res.status(500).end();
  }
});

export default router;
