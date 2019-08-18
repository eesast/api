import express from "express";
import authenticate from "../middlewares/authenticate";
import Reservation from "../models/reservation";
import pick from "lodash.pick";

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
router.get("/", async (req, res, next) => {
  const query = {
    ...pick(req.query, ["itemId", "userId"]),
    ...(req.query.from && {
      from: {
        $gte: new Date(req.query.from),
        $lt: new Date().setDate(new Date(req.query.from).getDate() + 1)
      }
    }),
    ...(req.query.to && {
      to: {
        $gte: new Date(req.query.to),
        $lt: new Date().setDate(new Date(req.query.to).getDate() + 1)
      }
    }),
    itemId: req.query.roomOnly === "true" ? -1 : { $ne: -1 }
  };

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  try {
    const reservations = await Reservation.find(query, "-_id -__v", {
      skip: begin,
      limit: end - begin + 1,
      sort: "-createdAt"
    });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
});

/**
 * GET reservation of Id
 * @param {number} id
 * @returns {Object} reservation with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne(
      { id: req.params.id },
      "-_id -__v"
    );

    if (!reservation) {
      return res.status(404).send("404 Not Found: Reservation does not exist");
    }

    res.json(reservation);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new reservation
 * @returns Location header
 */
router.post("/", authenticate([]), async (req, res, next) => {
  try {
    const reservation = await new Reservation({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    res.setHeader("Location", "/v1/reservations/" + reservation.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT existing reservation
 * @param {number} id - updating reservation's id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "self", "keeper"]),
  async (req, res, next) => {
    try {
      const reservation = await Reservation.findOne({ id: req.params.id });

      if (!reservation) {
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");
      }

      if (req.auth.selfCheckRequired) {
        if (reservation.userId !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }

      const update = {
        ...req.body,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      };

      const newReservation = await Reservation.findOneAndUpdate(
        { id: req.params.id },
        update
      );

      res.setHeader("Location", "/v1/reservations/" + newReservation!.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE a reservation of Id
 * @param {number} id - deleting reservation's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "keeper"]),
  async (req, res, next) => {
    try {
      const deleteReservation = await Reservation.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteReservation) {
        return res
          .status(404)
          .send("404 Not Found: Reservation does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
