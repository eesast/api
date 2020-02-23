import express from "express";
import authenticate from "../middlewares/authenticate";
import Track from "../models/track";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET tracks with queries
 * @param {string} name name of the track
 * @param {number} year year of the track
 * @param {boolean} open track open to join
 * @param {number} player track one have joined
 * @returns {Object[]} certain tracks without players
 */
router.get("/", authenticate([]), async (req, res, next) => {
  const query: any = pick(req.query, ["name", "year", "open", "player"]);
  if (query.open) query.open = query.open == "true";
  if (query.year) query.year = parseFloat(query.year);
  if (query.player) query.player = parseFloat(query.year);
  try {
    const tracks = await Track.find(query, "-_id -__v -player");
    res.json(tracks);
  } catch (e) {
    next(e);
  }
});

/**
 * POST new track
 * @param {string} name name of the track
 * @param {number} year year of the track default this year
 * @param {number} description description of the track default "No Desciptions"
 * @returns Location header
 */
router.post("/", authenticate(["root", "admin"]), async (req, res, next) => {
  const { name, year, description, open } = pick(req.body, [
    "name",
    "year",
    "description",
    "open"
  ]);
  try {
    const newTrack = new Track({
      name,
      year,
      description,
      open,
      player: []
    });
    const result = await newTrack.save();
    res.setHeader("Location", `/v1/tracks/${result.id}`);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT existing track
 * @param {number} id id of the track
 * @param {string} name body:newname of the track
 * @param {number} year body:year of the track default this year
 * @param {number} description body:description of the track default "No Desciptions"
 * @returns status code
 */
router.put("/:id", authenticate(["root", "admin"]), async (req, res, next) => {
  const id = req.params.id;
  const query = pick(req.body, ["name", "year", "description", "open"]);
  try {
    console.log(query);
    await Track.updateOne({ id }, { $set: query });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST registration of a track
 * @param {number} id track to join
 * @param {number} userId user to join
 * @returns status
 */
router.post(
  "/:id/registration",
  authenticate(["root", "admin", "self"]),
  async (req, res, next) => {
    const userId = req.body.userId;
    const trackId = req.params.id;
    if (req.auth.selfCheckRequired) {
      if (parseFloat(userId) !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }
    try {
      const track = await Track.findOne({ id: trackId });
      if (!track)
        return res.status(404).send("404 Not Found: Track not found.");

      if (!track.open && req.auth.selfCheckRequired)
        return res.status(403).send("403 Forbidden: Track not opened.");

      const old = await Track.findOne({ player: userId, year: track.year });
      if (old)
        return res
          .status(409)
          .send("409 Conflict: You should not join multiple tracks.");

      await Track.findOneAndUpdate(
        { id: trackId },
        { $push: { player: userId } }
      );
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE registration of a track
 * @param {number} id track to leave
 * @param {number} userId user to leave
 * @returns status
 */
router.delete(
  "/:id/registration/:userId",
  authenticate(["root", "admin", "self"]),
  async (req, res, next) => {
    const userId = req.params.userId;
    const trackId = req.params.id;
    if (req.auth.selfCheckRequired) {
      if (parseFloat(userId) !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }
    try {
      const track = await Track.findOne({ id: trackId, player: userId });
      if (!track)
        return res.status(404).send("404 Not Found: Track not existed");

      if (!track.open && req.auth.selfCheckRequired)
        return res.status(403).send("403 Forbidden: Track not Opened.");

      await Track.findOneAndUpdate(
        { id: trackId },
        { $pull: { player: userId } }
      );
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET track of id
 * @param {number} id
 * @param {boolean} playerInfo
 * @returns {Object} track
 */
router.get("/:id", authenticate([]), async (req, res, next) => {
  const id = req.params.id;
  const playerInfo = req.query.playerInfo || false;
  try {
    let query = "-_id -__v";
    if (!playerInfo) query += " -player";
    const result = await Track.findOne({ id }, query);
    if (!result) return res.status(404).send("404 Not Found: Track not found.");
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE track
 * @param {string} id ID of the track
 * @returns No Track or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "admin"]),
  async (req, res, next) => {
    try {
      const deleteTrack = await Track.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteTrack) {
        return res.status(404).send("404 Not Found: Track does not exist");
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
