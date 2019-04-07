import * as bcrypt from "bcrypt";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import secret from "../config/secret";
import authenticate from "../middlewares/authenticate";
import checkToken from "../middlewares/checkToken";
import User from "../models/user";

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
router.get("/", authenticate([]), (req, res) => {
  const query = {} as any;
  if (req.query.username) {
    query.username = req.query.username;
  }
  if (req.query.department) {
    query.department = req.query.department;
  }
  if (req.query.class) {
    query.class = req.query.class;
  }

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

  User.find(
    query,
    select,
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, users) => {
      if (err) {
        return res.status(500).end();
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(users));
    }
  );
});

/**
 * GET user of Id
 * @param {number} id
 * @param {boolean} detailInfo
 * @returns {Object} user with id
 */
router.get("/:id", checkToken, (req, res) => {
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

  User.findOne({ id: req.params.id }, select, (err, user) => {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(user));
  });
});

/**
 * POST new user
 * @returns Location header
 */
router.post("/", (req, res) => {
  const password = req.body.password;
  if (!password) {
    return res.status(422).send("422 Unprocessable Entity: Missing form data");
  }

  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).end();
    }

    req.body.password = hash;
    req.body.group = "student";
    req.body.role = "writer";
    const newUser = new User(req.body);

    newUser.save((error, user) => {
      if (error) {
        return res.status(500).end();
      }

      res.setHeader("Location", "/v1/users/" + user.id);
      res.status(201).end();
    });
  });
});

/**
 * POST login form
 * @returns {string} token
 */
router.post("/login", (req, res) => {
  const id = req.body.id;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  if (!((id || username || email) && password)) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing credentials");
  }

  const query = { username };
  return User.findOne(query, (err, user) => {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    bcrypt.compare(password, user.password, (error, valid) => {
      if (error) {
        return res.status(500).end();
      }

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
        res.status(200).send({ token });
      } else {
        res.status(401).end();
      }
    });
  });
});

/**
 * POST i-forgot password retrieval
 * @returns No Content or Not Found
 */
router.post("/forgot", (req, res) => {
  res.status(404).end();
});

/**
 * PUT existing user
 * @param {number} id - updating user's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), (req, res) => {
  if (req.auth.selfCheckRequired) {
    if (parseFloat(req.params.id) !== req.auth.id) {
      return res.status(401).send("401 Unauthorized: Permission denied");
    }
  }

  if (req.auth.role !== "root") {
    delete req.body.group;
    delete req.body.role;
  }

  const password = req.body.password;
  if (password) {
    const saltRounds = 10;
    req.body.password = bcrypt.hashSync(password, saltRounds);
  }

  const update = { updatedAt: new Date(), ...req.body };
  return User.findOneAndUpdate({ id: req.params.id }, update, (err, user) => {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.setHeader("Location", "/v1/users/" + user.id);
    res.status(204).end();
  });
});

/**
 * DELETE a user of Id
 * @param {number} id - deleting user's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  User.findOneAndDelete({ id: req.params.id }, (err, user) => {
    if (err) {
      return res.status(500).end();
    }
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist");
    }

    res.status(204).end();
  });
});

export default router;
