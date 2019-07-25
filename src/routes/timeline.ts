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
  Timeline.find(
    { available: true },
    "-_id -__v -available",
    (err, timeline) => {
      if (err) {
        return res.status(500).end();
      }
      if (!timeline) {
        return res.status(404).send("404 Not Found: Item does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(timeline));
    }
  );
});

/**
 * POST new item
 * @returns Location header
 */
router.post("/", authenticate(["root"]), (req, res) => {
  const newItem = new Timeline({
    createdAt: new Date(),
    createdBy: req.auth.id,
    updatedAt: new Date(),
    updatedBy: req.auth.id,
    ...req.body
  });

  newItem.save((err, item) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/items/" + item.id);
    res.status(201).end();
  });
});

/**
 * DELETE an item of Id
 * @param {number} id - deleting item's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  Timeline.findOneAndUpdate(
    { id: req.params.id },
    {
      $set: {
        available: false,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      }
    },
    (err, item) => {
      if (err) {
        return res.status(500).end();
      }
      if (!item) {
        return res.status(404).send("404 Not Found: Item does not exist");
      }

      res.status(204).end();
    }
  );
});

export default router;
