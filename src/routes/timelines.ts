import express from "express";
import authenticate from "../middlewares/authenticate";
import Timeline from "../models/timeline";

const router = express.Router();

/**
 * GET a timeline of Id
 * @param {number} id
 * @returns {Object} timeline with id
 */
router.get("/", async (req, res) => {
  try {
    const timeline = await Timeline.find({}, "-_id -__v");
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
router.post("/", authenticate(["root", "editor"]), async (req, res) => {
  try {
    const newTimeline = new Timeline({
      ...req.body,
      createdAt: new Date(),
      createdBy: req.auth.id,
      updatedAt: new Date(),
      updatedBy: req.auth.id
    });
    const item = await newTimeline.save();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(201).end(JSON.stringify({ id: item.id }));
  } catch (err) {
    return res.status(500).end();
  }
});

/**
 * PUT a timeline of Id
 * @param {number} id - change timeline's id
 * @returns No Content or Not Found
 */
router.put("/:id", authenticate(["root", "editor"]), async (req, res) => {
  try {
    const item = await Timeline.findOneAndUpdate(
      {
        id: req.params.id
      },
      {
        $set: {
          ...req.body,
          updatedAt: new Date(),
          updatedBy: req.auth.id
        }
      }
    );
    if (!item) {
      return res.status(404).send("404 Not Found: Timespot does not exist");
    }
    res.status(204).end();
  } catch (err) {
    return res.status(500).end();
  }
});

/**
 * DELETE a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), async (req, res) => {
  try {
    const item = await Timeline.findOneAndDelete({ id: req.params.id });
    if (!item) {
      return res.status(404).send("404 Not Found: Timespot does not exist");
    }
    res.status(204).end();
  } catch (err) {
    return res.status(500).end();
  }
});

export default router;
