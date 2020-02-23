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
 * @param {number} playerId track one have joined
 * @returns {Object[]} certain tracks without players
 */
router.get("/", authenticate([]), async (req, res, next) => {
  const query: any = pick(req.query, ["name", "year", "open", "playerId"]);
  if (query.open) query.open = query.open == "true";
  if (query.year) query.year = parseFloat(query.year);
  if (query.playerId) query.players = parseFloat(query.playerId);
  delete query.playerId;

  try {
    const tracks = await Track.find(query, "-_id -__v -players");
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
      players: []
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
    await Track.updateOne({ id }, { $set: query });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST join a track
 * @param {number} id track to join
 * @param {number} playerId user to join
 * @returns status
 */
router.post(
  "/:id/players",
  authenticate(["root", "admin", "self"]),
  async (req, res, next) => {
    const playerId = req.body.playerId;
    const trackId = req.params.id;
    if (req.auth.selfCheckRequired) {
      if (parseFloat(playerId) !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }
    try {
      const track = await Track.findOne({ id: trackId });
      if (!track)
        return res.status(404).send("404 Not Found: Track not found.");

      if (!track.open && req.auth.selfCheckRequired)
        return res.status(403).send("403 Forbidden: Track not opened.");

      const old = await Track.findOne({ players: playerId, year: track.year });
      if (old)
        return res
          .status(409)
          .send("409 Conflict: You should not join multiple tracks.");

      await Track.findOneAndUpdate(
        { id: trackId },
        { $push: { players: playerId } }
      );
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Check whether a player joins a track
 * @param {number} id trackId
 * @param {number} playerId
 * @returns status
 */
router.get("/:id/players/:playerId", authenticate([]), async (req, res) => {
  const playerId = req.params.playerId;
  const trackId = req.params.id;
  const track = await Track.findOne({ id: trackId, players: playerId });
  if (track) return res.status(200).end();
  return res
    .status(404)
    .send("404 Not Found: Track not found or player is not in");
});

/**
 * DELETE leave a track
 * @param {number} id track to leave
 * @param {number} playerId user to leave
 * @returns status
 */
router.delete(
  "/:id/players/:playerId",
  authenticate(["root", "admin", "self"]),
  async (req, res, next) => {
    const playerId = req.params.playerId;
    const trackId = req.params.id;
    if (req.auth.selfCheckRequired) {
      if (parseFloat(playerId) !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }
    try {
      const track = await Track.findOne({ id: trackId, players: playerId });
      if (!track)
        return res.status(404).send("404 Not Found: Track not existed");

      if (!track.open && req.auth.selfCheckRequired)
        return res.status(403).send("403 Forbidden: Track not opened.");

      await Track.findOneAndUpdate(
        { id: trackId },
        { $pull: { players: playerId } }
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
    if (!playerInfo) query += " -players";
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
