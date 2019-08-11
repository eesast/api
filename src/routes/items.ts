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
router.get("/", authenticate([]), async (req, res, next) => {
  const query = {
    ...(req.query.name && {
      name: { $regex: req.query.name, $options: "i" }
    }),
    ...(req.query.available && {
      left: { $gt: 0 }
    })
  };

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  try {
    const items = await Item.find(query, "-_id -__v", {
      skip: begin,
      limit: end - begin + 1,
      sort: "-createdAt"
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * GET item of Id
 * @param {number} id
 * @returns {Object} item with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id }, "-_id -__v");

    if (!item) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new item
 * @returns Location header
 */
router.post("/", authenticate(["root", "keeper"]), async (req, res, next) => {
  try {
    const item = await new Item({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    res.setHeader("Location", "/v1/items/" + item.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT existing item
 * @param {number} id - updating item's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "keeper"]), async (req, res, next) => {
  try {
    const item = await Item.findOne({ id: req.params.id });

    if (!item) {
      return res.status(404).send("404 Not Found: Item does not exist");
    }

    const update = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.auth.id
    };

    const newItem = await Item.findOneAndUpdate({ id: req.params.id }, update);

    res.setHeader("Location", "/v1/items/" + newItem!.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE an item of Id
 * @param {number} id - deleting item's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "keeper"]),
  async (req, res, next) => {
    try {
      const deleteItem = await Item.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteItem) {
        return res.status(404).send("404 Not Found: Item does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
