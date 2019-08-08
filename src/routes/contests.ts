import express from "express";
import authenticate from "../middlewares/authenticate";
import Contest from "../models/contest";

const router = express.Router();

/**
 * GET contests with queries
 * @param {number} id
 * @param {string} name
 * @param {string} alias
 * @param {boolean} available
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} certain contests
 */
router.get("/", (req, res) => {
  const query: any = {};
  if (req.query.id) {
    query.id = parseInt(req.query.id, 10);
  }
  if (req.query.name) {
    query.name = req.query.name;
  }
  if (req.query.alias) {
    query.alias = req.query.alias;
  }
  if (req.query.available === "true") {
    query.available = true;
  }
  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  const select = "-_id -__v";

  Contest.find(
    query,
    select,
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, contests) => {
      if (err) {
        return res.status(500).end();
      }

      if (contests.length === 0) {
        return res.status(200).end(JSON.stringify([]));
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(contests));
    }
  );
});

/**
 * GET contest of id
 * @param {Number} id
 * @returns {Object} contest with id
 */
router.get("/:id", (req, res) => {
  Contest.findOne({ id: req.params.id }, "-_id -__v", (err, contest) => {
    if (err) {
      return res.status(500).end();
    }
    if (!contest) {
      return res.status(404).send("404 Not Found: Contest does not exits");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(contest));
  });
});

/**
 * POST new contest
 * @returns {String} Location header
 */
router.post("/", authenticate(["root", "organizer"]), (req, res) => {
  const newContest = new Contest(req.body);

  newContest.save((err, contest) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/contests/" + contest.id);
    res.status(201).end();
  });
});

/**
 * PUT existing contest
 * @param {Number} id - updating contest's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "organizer"]), (req, res) => {
  Contest.findOne({ id: req.params.id }, (err, contest) => {
    if (err) {
      return res.status(500).end();
    }
    if (!contest) {
      return res.status(404).send("404 Not Found: Contest does not exist");
    }

    const update = { updatedAt: new Date(), ...req.body };
    Contest.findOneAndUpdate(
      { id: req.params.id },
      update,
      (error, newContest) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newContest) {
          return res.status(404).send("404 Not Found: Contest does not exist");
        }

        res.setHeader("Location", "/v1/contests/" + newContest.id);
        res.status(204).end();
      }
    );
  });
});

/**
 * DELETE an contest of id
 * @param {Number} id
 * @returns No Contest or Not Found
 */
router.delete("/:id", authenticate(["root", "organizer"]), (req, res) => {
  Contest.findOneAndDelete({ id: req.params.id }, (err, contest) => {
    if (err) {
      return res.status(500).end();
    }
    if (!contest) {
      return res.status(404).send("404 Not Found: Contest does not exist");
    }

    res.status(204).end();
  });
});

export default router;
