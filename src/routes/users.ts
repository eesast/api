import * as bcrypt from "bcrypt";
import express from "express";
import * as jwt from "jsonwebtoken";
import secret from "../configs/secret";
import authenticate from "../middlewares/authenticate";
import checkToken from "../middlewares/checkToken";
import User from "../models/user";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET users with queries
 * @param {string} username
 * @param {string} department
 * @param {string} class
 * @param {number} begin
 * @param {number} end
 * @param {boolean} detailInfo
 * @returns certain users
 */
router.get("/", authenticate([]), async (req, res, next) => {
  const query = pick(req.query, ["username", "department", "class"]);

  let select = "-_id -__v -password";
  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
  const role = req.auth.role || "";
  if (
    role !== "root" ||
    !req.query.detailInfo ||
    req.query.detailInfo.toString() === "false"
  ) {
    select =
      select + " -group -role -username -email -phone -department -class";
  }

  try {
    const users = await User.find(query, select, {
      skip: begin,
      limit: end - begin + 1,
      sort: "-createdAt"
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

/**
 * GET user of Id
 * @param {number} id
 * @param {boolean} detailInfo
 * @returns {Object} user with id
 */
router.get("/:id", checkToken, async (req, res, next) => {
  let select = "-_id -__v -password";
  let hasDetailInfo = false;
  if (
    req.auth.tokenValid &&
    req.query.detailInfo &&
    req.query.detailInfo.toString() === "true"
  ) {
    if (
      (req.auth.id && req.auth.id.toString() === req.params.id) ||
      req.auth.role === "root"
    ) {
      hasDetailInfo = true;
    }
  }
  if (!hasDetailInfo) {
    select = select + " -group -role -email -phone -department -class";
  }

  try {
    const user = await User.findOne({ id: req.params.id }, select);

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new user
 * @returns Location header
 */
router.post("/", async (req, res, next) => {
  const password = req.body.password;
  if (!password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = await new User({
      group: "student",
      role: "writer",
      ...req.body,
      password: hash
    }).save();

    res.setHeader("Location", "/v1/users/" + user.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST login form
 * @returns {string} token
 */
router.post("/login", async (req, res, next) => {
  const id = req.body.id;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  if (!((id || username || email) && password)) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing credentials");
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (valid) {
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          group: user.group,
          role: user.role
        },
        secret,
        {
          expiresIn: "12h"
        }
      );
      res.json({ token });
    } else {
      res.status(401).end();
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST i-forgot password retrieval
 * @returns No Content or Not Found
 */
router.post("/forgot", async (req, res) => {
  res.status(404).end();
});

/**
 * PUT existing user
 * @param {number} id - updating user's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), async (req, res, next) => {
  if (req.auth.selfCheckRequired) {
    if (parseFloat(req.params.id) !== req.auth.id) {
      return res.status(401).send("401 Unauthorized: Permission denied");
    }
  }

  if (req.auth.role !== "root") {
    delete req.body.group;
    delete req.body.role;
  }

  let password;
  if (req.body.password) {
    const saltRounds = 10;
    password = await bcrypt.hash(req.body.password, saltRounds);
  }

  try {
    const update = {
      ...req.body,
      ...(password && { password }),
      updatedAt: new Date(),
      updatedBy: req.auth.id
    };
    const user = await User.findOneAndUpdate({ id: req.params.id }, update);

    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.setHeader("Location", "/v1/users/" + user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE a user of Id
 * @param {number} id - deleting user's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), async (req, res, next) => {
  try {
    const deleteUser = await User.findOneAndDelete({
      id: req.params.id
    });

    if (!deleteUser) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
