import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user";
import secret from "../config/secret";
import authenticate from "../middlewares/authenticate";
const router = express.Router();

/**
 * GET
 * @query {String} username
 * @query {String} group
 * @query {String} role
 * @query {String} email
 * @query {String} name
 * @query {Number} phone
 * @query {String} department
 * @query {String} class
 * @returns certain users
 */
router.get("/", (req, res) => {
  let query = {};
  if (req.query) query = req.query;

  User.find(query, "-_id -__v -password", (err, users) => {
    if (err) return res.status(500).end();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(users));
  });
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} user with id
 */
router.get("/:id", (req, res) => {
  User.findOne({ id: req.params.id }, "-_id -__v -password", (err, user) => {
    if (err) return res.status(500).end();
    if (!user)
      return res.status(404).send("404 Not Found: User does not exist");

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(user));
  });
});

/**
 * POST
 * @returns {String} Location header
 */
router.post("/", (req, res) => {
  const password = req.body.password;
  if (!password)
    return res.status(422).send("422 Unprocessable Entity: Missing form data");

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).end();

    req.body.password = hash;
    req.body.group = "student";
    req.body.role = "reader";
    const newUser = new User(req.body);

    newUser.save((err, user) => {
      if (err) return res.status(500).end();

      res.setHeader("Location", "/v1/users/" + user.id);
      res.status(201).end();
    });
  });
});

/**
 * POST
 * @returns {String} token
 */
router.post("/login", (req, res) => {
  const id = req.body.id;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  if (!((id || username || email) && password))
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing credentials");

  const query = { username };
  User.findOne(query, (err, user) => {
    if (err) return res.status(500).end();
    if (!user)
      return res.status(404).send("404 Not Found: User does not exist");

    bcrypt.compare(password, user.password, (err, valid) => {
      if (err) return res.status(500).end();

      if (valid) {
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            email: user.email
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
 * POST
 * @returns No Content or Not Found
 */
router.post("/forgot", (req, res) => {
  res.status(404).end();
});

/**
 * PUT
 * @param {Number} id updating user's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), (req, res) => {
  if (req.selfCheckRequired) {
    if (parseFloat(req.params.id) !== req.auth.id) {
      return res.status(401).send("401 Unauthorized: Permission denied");
    }
  }

  const password = req.body.password;
  if (password) {
    const saltRounds = 10;
    req.body.password = bcrypt.hashSync(password, saltRounds);
  }

  const update = { updatedAt: new Date(), ...req.body };
  User.findOneAndUpdate({ id: req.params.id }, update, (err, user) => {
    if (err) return res.status(500).end();
    if (!user)
      return res.status(404).send("404 Not Found: User does not exist");

    res.setHeader("Location", "/v1/users/" + user.id);
    res.status(204).end();
  });
});

/**
 * DELETE
 * @param {Number} id deleting user's id
 * @returns {String} No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  User.findOneAndDelete({ id: req.params.id }, (err, user) => {
    if (err) return res.status(500).end();
    if (!user)
      return res.status(404).send("404 Not Found: User does not exist");

    res.status(204).end();
  });
});

export default router;
