import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Timeline from "../models/timeline";
import { editableParams as timelineEditableParams } from "../models/timeline";
import dataCleaner from "../middlewares/dataCleaner";

const router = express.Router();

/**
 * GET a timeline of Id
 * @param {number} id
 * @returns {Object} timeline with id
 */
router.get("/", async (req, res) => {
  try {
    let timeline = await Timeline.find({ isAlive: true }, "-_id -__v -isAlive");
    if (!timeline) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(timeline));
  } catch (err) {
    return res.status(500).end();
  }
});

/**
 * POST new timeline
 * @returns Location header
 */
router.post(
  "/",
  authenticate(["root", "editor"]),
  dataCleaner(timelineEditableParams),
  async (req, res) => {
    try {
      let newTimeline = new Timeline({
        createdAt: new Date(),
        createdBy: req.auth.id,
        updatedAt: new Date(),
        updatedBy: req.auth.id,
        ...req.body
      });
      let item = await newTimeline.save();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(201).end(JSON.stringify({ id: item.id }));
    } catch (err) {
      return res.status(500).end();
    }
  }
);

/**
 * PUT a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "editor"]),
  dataCleaner(timelineEditableParams),
  async (req, res) => {
    try {
      let item = await Timeline.findOneAndUpdate(
        { id: req.params.id, isAlive: true },
        {
          $set: {
            updatedAt: new Date(),
            updatedBy: req.auth.id,
            ...req.body
          }
        }
      );
      if (!item) {
        return res.status(404).send("404 Not Found: Timespot  does not exist");
      }
      res.status(204).end();
    } catch (err) {
      return res.status(500).end();
    }
  }
);
/**
 * DELETE a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), async (req, res) => {
  try {
    let item = await Timeline.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          isAlive: false,
          updatedAt: new Date(),
          updatedBy: req.auth.id
        }
      }
    );
    if (!item) {
      return res.status(404).send("404 Not Found: Timespot  does not exist");
    }
    res.status(204).end();
  } catch (err) {
    return res.status(500).end();
  }
});

export default router;
