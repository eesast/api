import * as express from "express";
import { IAuthRequest } from "../config/jwt";
import authenticate from "../middlewares/authenticate";
import Announcement, { IAnnouncementModel } from "../models/announcement";

const router = express.Router();

/**
 * GET announcements with queries
 * @param {string} title - Title will be partial matched
 * @param {string} alias
 * @param {number} contestId
 * @param {number} priority
 * @param {boolean} noContent
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} certain articles
 */
router.get(
  "/",
  (
    req: {
      query: { [key: string]: string };
      auth: IAuthRequest;
    },
    res
  ) => {
    const query: {
      title?: object;
      alias?: string;
      contestId?: number;
      priority?: number;
      noContent?: boolean;
      begin?: number;
      end?: number;
    } = {};

    if (req.query.title) {
      query.title = { $regex: req.query.title, $options: "i" };
    }
    if (req.query.alias) {
        query.alias = req.query.alias;
      }
    if (req.query.contestId) {
      query.contestId = parseInt(req.query.contestId, 10);
    }
    if (req.query.priority) {
      query.priority = parseInt(req.query.priority, 10);
    }

    const begin = parseInt(req.query.begin, 10) || 0;
    const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
    const select =
      "-_id -__v" + (req.query.noContent === "true" ? " -content" : "");

    Announcement.find(
      query,
      select,
      { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
      (err, announcements) => {
        if (err) {
          return res.status(500).end();
        }
        if (announcements.length === 0) {
          return res.status(200).end(JSON.stringify([]));
        }

        if (query.alias) {
          Announcement.findOneAndUpdate(
            { id: announcements[0].id },
            { $inc: { views: 1 } },
            // tslint:disable-next-line: no-empty
            () => {}
          );
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(200).end(JSON.stringify(announcements));
      }
    );
  }
);

/**
 * GET announcement of Id
 * @param {number} id - announcement Id
 * @returns {Object} - announcement with id
 */
router.get(
  "/:id",
  (req: { params: { id: string }; auth: IAuthRequest }, res) => {
    Announcement.findOne(
      { id: req.params.id },
      "-_id -__v",
      (err, announcement) => {
        if (err) {
          return res.status(500).end();
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
  }
);

/**
 * POST new announcement
 * @returns Location header
 */
router.post(
  "/",
  authenticate(["root"]),
  (req, res) => {
    const newAnnouncement = new Announcement(req.body);

    newAnnouncement.save((err, announcement) => {
      if (err) {
        return res.status(500).end();
      }

      res.setHeader("Location", "/v1/announcements/" + announcement.id);
      res.status(201).end();
    });
  }
);

/**
 * PUT existing announcement
 * @param {number} id - updating announcement's Id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root"]),
  async (
    req: {
      params: { id: string };
      body: Partial<IAnnouncementModel>;
      auth: IAuthRequest;
    },
    res
  ) => {
    try {
      const announcement = await Announcement.findOne({ id: req.params.id });
      if (!announcement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }
    } catch (err) {
      return res.status(500).end();
    }

    const update: Partial<IAnnouncementModel> = {
      updatedAt: new Date(),
      ...req.body
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
      return res.status(500).end();
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
  authenticate(["root"]),
  async (req: { params: { id: string }; auth: IAuthRequest }, res) => {
    try {
      const announcement = await Announcement.findOne({ id: req.params.id });
      if (!announcement) {
        return res
          .status(404)
          .send("404 Not Found: Announcement does not exist");
      }
    } catch (err) {
      return res.status(500).end();
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
      return res.status(500).end();
    }
  }
);

export default router;
