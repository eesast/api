import express from "express";
import Reservation from "../models/reservation";
import authenticate from "../middlewares/authenticate";
const router = express.Router();

/**
 * GET
 * @query {Number} itemId
 * @query {Number} userId
 * @query {Date} from -- ISO date
 * @query {Date} to
 * @query {Number} begin
 * @query {Number} end
 * @query {String} roomOnly
 * @returns {[Object]} certain reservations
 */
router.get("/", (req, res) => {
  let query = {};
  if (req.query.itemId) query.itemId = req.query.itemId;
  if (req.query.userId) query.userId = req.query.userId;
  if (req.query.from)
    query.from = {
      $gte: new Date(req.query.from),
      $lt: new Date().setDate(new Date(req.query.from).getDate() + 1)
    };
  if (req.query.to)
    query.to = {
      $gte: new Date(req.query.to),
      $lt: new Date().setDate(new Date(req.query.to).getDate() + 1)
    };
  if (req.query.roomOnly && req.query.roomOnly === "true") query.itemId = -1;
  if (!req.query.roomOnly || req.query.roomOnly === "false")
    query.itemId = { $ne: -1 };
  const begin = parseInt(req.query.begin) || 0;
  const end = parseInt(req.query.end) || Number.MAX_SAFE_INTEGER;

  Reservation.find(
    query,
    "-_id -__v",
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, reservations) => {
      if (err) return res.status(500).end();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(reservations));
    }
  );
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} reservation with id
 */
router.get("/:id", (req, res) => {
  Reservation.findOne(
    { id: req.params.id },
    "-_id -__v",
    (err, reservation) => {
      if (err) return res.status(500).end();
      if (!reservation)
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(reservation));
    }
  );
});

/**
 * POST
 * @returns {String} Location header
 */
router.post("/", authenticate(), (req, res) => {
  if (req.body.from) req.body.from = new Date(req.body.from);
  if (req.body.to) req.body.to = new Date(req.body.to);
  const newReservation = new Reservation(req.body);

  newReservation.save((err, reservation) => {
    if (err) return res.status(500).end();

    res.setHeader("Location", "/v1/reservations/" + reservation.id);
    res.status(201).end();
  });
});

/**
 * PUT
 * @param {Number} id updating reservation's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Reservation.findOne({ id: req.params.id }, (err, reservation) => {
    if (err) return res.status(500).end();
    if (!reservation)
      return res.status(404).send("404 Not Found: Reservation does not exist");

    const update = { updatedAt: new Date(), ...req.body };
    reservation.updateOne(update, (err, newReservation) => {
      if (err) return res.status(500).end();
      if (!newReservation)
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");

      res.setHeader("Location", "/v1/reservations/" + newReservation.id);
      res.status(204).end();
    });
  });
});

/**
 * DELETE
 * @param {Number} id deleting reservation's id
 * @returns {String} No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Reservation.findOneAndDelete({ id: req.params.id }, (err, reservation) => {
    if (err) return res.status(500).end();
    if (!reservation)
      return res.status(404).send("404 Not Found: Reservation does not exist");

    res.status(204).end();
  });
});

export default router;
