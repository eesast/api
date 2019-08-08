import express from "express";
import authenticate from "../middlewares/authenticate";
import Item from "../models/item";

const router = express.Router();

/**
 * GET items with queries
 * @param {string} name
 * @param {boolean} available
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} certain items
 */
router.get("/", authenticate([]), (req, res) => {
  const query: any = {};
  if (req.query.name) {
    query.name = { $regex: req.query.name, $options: "i" };
  }
  if (req.query.available) {
    query.left = { $gt: 0 };
  }
  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  Item.find(
    query,
    "-_id -__v",
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, items) => {
      if (err) {
        return res.status(500).end();
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(items));
    }
  );
});

/**
 * GET a item of Id
 * @param {number} id
 * @returns {Object} item with id
 */
router.get("/:id", (req, res) => {
  Item.findOne({ id: req.params.id }, "-_id -__v", (err, item) => {
    if (err) {
      return res.status(500).end();
    }
    if (!item) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(item));
  });
});

/**
 * POST new item
 * @returns Location header
 */
router.post("/", authenticate(["root", "keeper"]), (req, res) => {
  const newItem = new Item(req.body);

  newItem.save((err, item) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/items/" + item.id);
    res.status(201).end();
  });
});

/**
 * PUT existing item
 * @param {number} id - updating item's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "keeper"]), (req, res) => {
  const update = { updatedAt: new Date(), ...req.body };

  Item.findOneAndUpdate({ id: req.params.id }, update, (err, item) => {
    if (err) {
      return res.status(500).end();
    }
    if (!item) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    res.setHeader("Location", "/v1/items/" + item.id);
    res.status(204).end();
  });
});

/**
 * DELETE an item of Id
 * @param {number} id - deleting item's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Item.findOneAndDelete({ id: req.params.id }, (err, item) => {
    if (err) {
      return res.status(500).end();
    }
    if (!item) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    res.status(204).end();
  });
});

export default router;
