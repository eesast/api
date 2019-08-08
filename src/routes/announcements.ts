import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Announcement, { AnnouncementModel } from "../models/announcement";

const router = express.Router();

/**
 * GET announcements with queries
 * @param {number} contestId
 * @param {number} priority
 * @param {number} begin
 * @param {number} end
 * @returns {object[]} certain announcements
 */
router.get("/", (req, res, next) => {
  const query = {
    contestId: req.query.contestId as number,
    priority: req.query.priority as number
  };

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  Announcement.find(
    query,
    null,
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, announcements) => {
      if (err) {
        return next(err);
      }
      if (announcements.length === 0) {
        return res.status(200).end(JSON.stringify([]));
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(announcements));
    }
  );
});

/**
 * GET announcement of Id
 * @param {number} id - announcement Id
 * @returns {object} - announcement with id
 */
router.get("/:id", (req, res, next) => {
  Announcement.findOne(
    { id: req.params.id },
    "-_id -__v",
    (err, announcement) => {
      if (err) {
        return next(err);
      }
      if (!announcement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(announcement));
    }
  );
});

/**
 * POST new announcement
 * @returns Location header
 */
router.post("/", authenticate(["root", "organizer"]), (req, res, next) => {
  const newAnnouncement = new Announcement(req.body);

  newAnnouncement.save((err, announcement) => {
    if (err) {
      return next(err);
    }

    res.setHeader("Location", "/v1/announcements/" + announcement.id);
    res.status(201).end();
  });
});

/**
 * PUT existing announcement
 * @param {number} id - updating announcement's Id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const announcement = await Announcement.findOne({ id: req.params.id });
      if (!announcement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }
    } catch (err) {
      return next(err);
    }

    const update: AnnouncementModel = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.auth.id
    };

    try {
      const newAnnouncement = await Announcement.findOneAndUpdate(
        { id: req.params.id },
        update
      );
      if (!newAnnouncement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }
      res.setHeader("Location", "/v1/announcements/" + newAnnouncement.id);
      res.status(204).end();
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE an announcement of Id
 * @param {Number} id - deleting announcement's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const announcement = await Announcement.findOne({ id: req.params.id });
      if (!announcement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }
    } catch (err) {
      return next(err);
    }

    try {
      const deleteAnnouncement = await Announcement.findOneAndDelete({
        id: req.params.id
      });
      if (!deleteAnnouncement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }

      res.status(204).end();
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
