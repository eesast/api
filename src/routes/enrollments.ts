import express from "express";
import authenticate from "../middlewares/authenticate";
import Enrollment from "../models/enrollment";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET enrollment with queries
 * @param {number} userId
 * @param {number} contestId
 * @param {boolean} enroll
 * @returns {Object[]} enrollment of given contest and user
 */
router.get("/", async (req, res, next) => {
  const query = pick(req.query, ["userId", "contestId", "enroll"]);

  try {
    const enrollments = await Enrollment.find(query, "-_id -__v");
    res.json(enrollments);
  } catch (err) {
    next(err);
  }
});

/**
 * GET enrollment of id
 * @param {Number} id
 * @returns {Object} enrollment of given id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne(
      { id: req.params.id },
      "-_id -__v"
    );

    if (!enrollment) {
      return res.status(404).send("404 Not Found: Enrollment does not exist");
    }

    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new enrollment
 * @returns Location header
 */
router.post(
  "/",
  authenticate(["root", "organizer", "self"]),
  async (req, res, next) => {
    try {
      if (req.auth.selfCheckRequired) {
        req.body.userId = req.auth.id;
      }

      if (
        await Enrollment.findOne({
          userId: req.body.userId,
          contestId: req.body.contestId
        })
      ) {
        res.setHeader("Location", "/enrollments");
        return res.status(409).send("409 Conflict: Enrollment already exists");
      }

      const enrollment = await new Enrollment({
        ...req.body,
        createdBy: req.auth.id,
        updatedBy: req.auth.id
      }).save();

      res.setHeader("Location", "/v1/enrollments/" + enrollment.id);
      res.status(201).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT existing enrollment
 * @param {number} id - updating enrollment's Id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "organizer", "self"]),
  async (req, res, next) => {
    const update = {
      enroll: req.body.enroll,
      updatedAt: new Date(),
      updatedBy: req.auth.id
    };

    try {
      const newEnrollment = await Enrollment.findOneAndUpdate(
        { id: req.params.id },
        update
      );

      if (!newEnrollment) {
        return res.status(404).send("404 Not Found: Enrollment does not exist");
      }

      res.setHeader("Location", "/v1/enrollments/" + newEnrollment.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE an enrollment of Id
 * @param {Number} id - deleting enrollment's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "organizer", "self"]),
  async (req, res, next) => {
    try {
      const deleteEnrollment = await Enrollment.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteEnrollment) {
        return res.status(404).send("404 Not Found: Enrollment does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
