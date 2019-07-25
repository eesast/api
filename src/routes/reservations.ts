import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Reservation from "../models/reservation";

const router = express.Router();

/**
 * GET reservations with queries
 * @param {number} itemId
 * @param {number} userId
 * @param {Date} from - ISO date
 * @param {Date} to
 * @param {number} begin
 * @param {number} end
 * @param {string} roomOnly
 * @returns {Object[]} certain reservations
 */
router.get("/", (req, res) => {
  const query: any = {};
  if (req.query.itemId) {
    query.itemId = req.query.itemId;
  }
  if (req.query.userId) {
    query.userId = req.query.userId;
  }
  if (req.query.from) {
    query.from = {
      $gte: new Date(req.query.from),
      $lt: new Date().setDate(new Date(req.query.from).getDate() + 1)
    };
  }
  if (req.query.to) {
    query.to = {
      $gte: new Date(req.query.to),
      $lt: new Date().setDate(new Date(req.query.to).getDate() + 1)
    };
  }
  if (req.query.roomOnly && req.query.roomOnly === "true") {
    query.itemId = -1;
  }
  if (!req.query.roomOnly || req.query.roomOnly === "false") {
    query.itemId = { $ne: -1 };
  }
  req.query.available = true;
  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  Reservation.find(
    query,
    "-_id -__v",
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, reservations) => {
      if (err) {
        return res.status(500).end();
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(reservations));
    }
  );
});

/**
 * GET reservation of Id
 * @param {number} id
 * @returns {Object} reservation with id
 */
router.get("/:id", (req, res) => {
  Reservation.findOne(
    { id: req.params.id, available: true },
    "-_id -__v",
    (err, reservation) => {
      if (err) {
        return res.status(500).end();
      }
      if (!reservation) {
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(reservation));
    }
  );
});

/**
 * POST new reservation
 * @returns Location header
 */
router.post("/", authenticate([]), (req, res) => {
  if (req.body.from) {
    req.body.from = new Date(req.body.from);
  }
  if (req.body.to) {
    req.body.to = new Date(req.body.to);
  }
  const newReservation = new Reservation({
    createdAt: new Date(),
    createdBy: req.auth.id,
    updatedAt: new Date(),
    updatedBy: req.auth.id,
    ...req.body
  });

  newReservation.save((err, reservation) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/reservations/" + reservation.id);
    res.status(201).end();
  });
});

/**
 * PUT existing reservation
 * @param {number} id - updating reservation's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "keeper"]), (req, res) => {
  const update = {
    updatedAt: new Date(),
    updatedBy: req.auth.id,
    ...req.body
  };

  Reservation.findOneAndUpdate(
    { id: req.params.id, available: true },
    { $set: update },
    (err, reservation) => {
      if (err) {
        return res.status(500).end();
      }
      if (!reservation) {
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");
      }

      res.setHeader("Location", "/v1/reservations/" + reservation.id);
      res.status(204).end();
    }
  );
});

/**
 * DELETE a reservation of Id
 * @param {number} id - deleting reservation's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "keeper"]), (req, res) => {
  Reservation.findOneAndUpdate(
    { id: req.params.id, available: true },
    {
      $set: {
        available: false,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      }
    },
    (err, reservation) => {
      if (err) {
        return res.status(500).end();
      }
      if (!reservation) {
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");
      }

      res.status(204).end();
    }
  );
});

export default router;
