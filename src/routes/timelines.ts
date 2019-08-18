import express from "express";
import authenticate from "../middlewares/authenticate";
import Timeline from "../models/timeline";

const router = express.Router();

/**
 * GET a timeline of Id
 * @param {number} id
 * @returns {Object} timeline with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const timeline = await Timeline.findOne({ id: req.params.id }, "-_id -__v");

    if (!timeline) {
      return res.status(404).send("404 Not Found: Timeline does not exist");
    }

    res.json(timeline);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new timeline
 * @returns Location header
 */
router.post("/", authenticate(["root"]), async (req, res, next) => {
  try {
    const timeline = await new Timeline({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    res.setHeader("Location", "/v1/timelines/" + timeline.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT existing timeline
 * @param {number} id - updating timeline's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root"]), async (req, res, next) => {
  const update = {
    ...req.body,
    updatedAt: new Date(),
    updatedBy: req.auth.id
  };

  try {
    const newTimeline = await Timeline.findOneAndUpdate(
      { id: req.params.id },
      update
    );

    if (!newTimeline) {
      return res.status(404).send("404 Not Found: Timeline does not exist");
    }

    res.setHeader("Location", "/v1/timelines/" + newTimeline.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE a timeline of Id
 * @param {number} id - deleting timeline's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), async (req, res, next) => {
  try {
    const deleteTimeline = await Timeline.findOneAndDelete({
      id: req.params.id
    });

    if (!deleteTimeline) {
      return res.status(404).send("404 Not Found: Timeline does not exist");
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
