import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Timeline from "../models/timeline";

const router = express.Router();

/**
 * GET a timeline of Id
 * @param {number} id
 * @returns {Object} timeline with id
 */
router.get("/", (req, res) => {
  Timeline.find({ isAlive: true }, "-_id -__v -isAlive", (err, timeline) => {
    if (err) {
      return res.status(500).end();
    }
    if (!timeline) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(timeline));
  });
});

/**
 * POST new timeline
 * @returns Location header
 */
router.post("/", authenticate(["root"]), (req, res) => {
  Object.assign(req.body, {
    createdAt: new Date(),
    createdBy: req.auth.id,
    updatedAt: new Date(),
    updatedBy: req.auth.id
  });
  const newItem = new Timeline(req.body);

  newItem.save((err, item) => {
    if (err) {
      return res.status(500).end();
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(201).end({ id: newItem.id });
  });
});

/**
 * PUT a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.put("/:id", authenticate(["root"]), (req, res) => {
  Object.assign(req.body, {
    updatedAt: new Date(),
    updatedBy: req.auth.id
  });
  Timeline.findOneAndUpdate(
    { id: req.params.id, isAlive: true },
    {
      $set: req.body
    },
    (err, item) => {
      if (err) {
        return res.status(500).end();
      }
      if (!item) {
        return res.status(404).send("404 Not Found: Timespot  does not exist");
      }
      res.status(204).end();
    }
  );
});
/**
 * DELETE a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  Timeline.findOneAndUpdate(
    { id: req.params.id },
    {
      $set: {
        isAlive: false,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      }
    },
    (err, item) => {
      if (err) {
        return res.status(500).end();
      }
      if (!item) {
        return res.status(404).send("404 Not Found: Timespot  does not exist");
      }

      res.status(204).end();
    }
  );
});

export default router;
