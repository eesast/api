import express from "express";
import Item from "../models/item";
import authenticate from "../middlewares/authenticate";
const router = express.Router();

/**
 * GET
 * @query {String} name
 * @query {Boolean} available
 * @query {Number} begin
 * @query {Number} end
 * @returns {[Object]} certain items
 */
router.get("/", authenticate(), (req, res) => {
  let query = {};
  if (req.query.name) query.name = { $regex: req.query.name, $options: "i" };
  if (req.query.available) query.left = { $gt: 0 };
  const begin = parseInt(req.query.begin) || 0;
  const end = parseInt(req.query.end) || Number.MAX_SAFE_INTEGER;

  Item.find(
    query,
    "-_id -__v",
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, items) => {
      if (err) return res.status(500).end();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(items));
    }
  );
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} item with id
 */
router.get("/:id", (req, res) => {
  Item.findOne({ id: req.params.id }, "-_id -__v", (err, item) => {
    if (err) return res.status(500).end();
    if (!item)
      return res.status(404).send("404 Not Found: Item does not exist");

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(item));
  });
});

/**
 * POST
 * @returns {String} Location header
 */
router.post("/", authenticate(["root", "keeper"]), (req, res) => {
  const newItem = new Item(req.body);

  newItem.save((err, item) => {
    if (err) return res.status(500).end();

    res.setHeader("Location", "/v1/items/" + item.id);
    res.status(201).end();
  });
});

/**
 * PUT
 * @param {Number} id updating item's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Item.findOne({ id: req.params.id }, (err, item) => {
    if (err) return res.status(500).end();
    if (!item)
      return res.status(404).send("404 Not Found: Item does not exist");

    const update = { updatedAt: new Date(), ...req.body };
    item.updateOne(update, (err, newItem) => {
      if (err) return res.status(500).end();
      if (!newItem)
        return res.status(404).send("404 Not Found: Item does not exist");

      res.setHeader("Location", "/v1/items/" + newItem.id);
      res.status(204).end();
    });
  });
});

/**
 * DELETE
 * @param {Number} id deleting item's id
 * @returns {String} No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Item.findOneAndDelete({ id: req.params.id }, (err, item) => {
    if (err) return res.status(500).end();
    if (!item)
      return res.status(404).send("404 Not Found: Item does not exist");

    res.status(204).end();
  });
});

export default router;
