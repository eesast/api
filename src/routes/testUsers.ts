import * as express from "express";

const router = express.Router();

router.post("/", (req, res) => {
  if (req.body.username && req.body.password) {
    return res.status(201).send("User created");
  } else {
    return res.status(422).send("Missing info");
  }
});

export default router;
