import express from "express";
import authenticate from "../middlewares/authenticate";
import Appointment from "../models/appointment";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET appointments with queries
 * @param {number} contestId
 * @param {Date} from - ISO date
 * @param {Date} to
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} certain appointments
 */
router.get("/", async (req, res, next) => {
  const query = {
    ...pick(req.query, ["contestId"]),
    ...{
      date: {
        $gte: new Date(req.query.from || -8640000000000000),
        $lt: new Date(req.query.to || 8640000000000000)
      }
    }
  };

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  try {
    const appointments = await Appointment.find(query, "-_id -__v", {
      skip: begin,
      limit: end - begin + 1,
      sort: "-createdAt"
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

/**
 * GET appointment of Id
 * @param {number} id
 * @returns {Object} appointment with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne(
      { id: req.params.id },
      "-_id -__v"
    );

    if (!appointment) {
      return res.status(404).send("404 Not Found: Appointment does not exist");
    }

    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new appointment
 * @returns Location header
 */
router.post(
  "/",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const appointment = await new Appointment({
        ...req.body,
        createdBy: req.auth.id,
        updatedBy: req.auth.id
      }).save();

      res.setHeader("Location", "/v1/appointments/" + appointment.id);
      res.status(201).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT existing appointment
 * @param {number} id - updating appointment's id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const update = {
        date: req.body.date,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      };

      const newAppointment = await Appointment.findOneAndUpdate(
        { id: req.params.id },
        update
      );

      if (!newAppointment) {
        return res
          .status(404)
          .send("404 Not Found: Appointment does not exist");
      }

      res.setHeader("Location", "/v1/appointments/" + newAppointment.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE appointment of Id
 * @param {number} id - deleting appointment's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const deleteAppointment = await Appointment.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteAppointment) {
        return res
          .status(404)
          .send("404 Not Found: Appointment does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
