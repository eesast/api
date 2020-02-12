import express from "express";
import jwt from "jsonwebtoken";
import secret from "../configs/secret";
import authenticate from "../middlewares/authenticate";
import checkToken from "../middlewares/checkToken";
import Contest from "../models/contest";
import Room from "../models/room";
import Team from "../models/team";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET rooms with queries
 * @param {number} contestId
 * @param {boolean} available
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} rooms of given contest available
 */
router.get("/", checkToken, async (req, res, next) => {
  const query = {
    ...pick(req.query, ["contestId", "available"])
  };

  try {
    const rooms = await Room.find(query, "-_id -__v");
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

/**
 * GET room of id
 * @param {Number} id
 * @returns {Object} room with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findOne({ id: req.params.id }, "-_id -__v");

    if (!room) {
      return res.status(404).send("404 Not Found: Room does not exist");
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
});

/**
 * GET join room of Id
 * @param {number} id
 * @returns {Object} teams in room with id
 */
router.get("/:id/join", authenticate([]), async (req, res, next) => {
  try {
    const room = await Room.findOne({ id: req.params.id });
    if (!room) {
      return res.status(404).send("404 Not Found: Room does not exist");
    }

    const team = await Team.findOne({
      contestId: room.contestId,
      members: { $in: req.auth.id }
    });
    if (!team) {
      return res.status(400).send("400 Bad Request: User not in team");
    }
    if (room.teams.includes(team.id)) {
      return res.status(409).send("409 Conflict: Team already in room");
    }
    const teams = room.teams.concat([team.id]);
    const update = { updatedAt: new Date(), updatedBy: req.auth.id, teams };
    const newRoom = await Room.findOneAndUpdate({ id: req.params.id }, update);
    if (!newRoom) {
      return res.status(404).send("404 Not Found: Room does not exist");
    }

    res.json(teams);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET leave room of Id
 * @param {number} id
 * @returns teams in room with id
 */
router.get("/:id/leave", authenticate([]), async (req, res, next) => {
  try {
    const room = await Room.findOne({ id: req.params.id });
    if (!room) {
      return res.status(404).send("404 Not Found: Room does not exist");
    }

    const team = await Team.findOne({
      contestId: room.contestId,
      members: { $in: req.auth.id }
    });
    if (!team) {
      return res.status(400).send("400 Bad Request: User not in team");
    }
    const index = room.teams.indexOf(team.id);
    if (index === -1) {
      return res.status(404).send("404 Not Found: Team does not exist");
    }
    room.teams.splice(index, 1);
    const update = {
      updatedAt: new Date(),
      updatedBy: req.auth.id,
      teams: room.teams
    };
    const newRoom = await Room.findOneAndUpdate({ id: req.params.id }, update);
    if (!newRoom) {
      return res.status(404).send("404 Not Found: Room does not exist");
    }

    res.json(room.teams);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST new Room
 * @returns {String} Location header
 */
router.post("/", authenticate([]), async (req, res, next) => {
  try {
    const contest = await Contest.findOne({ id: req.body.contestId });
    if (!contest) {
      return res.status(400).send("400 Bad Request: Contest not available");
    }

    const room = await new Room({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    // TODO: run docker, and send token into container
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const token = jwt.sign({ roomId: room.id }, secret, {
      expiresIn: "15m"
    });
    console.log(token);

    res.setHeader("Location", "/v1/rooms/" + room.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST check token for starting server
 * @param {string} token
 * @returns 204 or 401
 */
router.post("/:token", async (req, res) => {
  try {
    console.log(req.params.token);

    const payload = jwt.verify(req.params.token, secret) as { roomId: number };
    const room = await Room.findOne({ id: payload.roomId });
    if (!room) {
      return res.status(401).send("401 Unauthorized: Wrong token");
    }

    await room.updateOne({
      available: true,
      updatedAt: new Date()
    });

    res.status(204).end();
  } catch (err) {
    res.status(401).send("401 Unauthorized: Wrong token");
  }
});

/**
 * PUT existing Room
 * @param {Number} id - updating Room's id
 * @returns {String} Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const room = await Room.findOne({ id: req.params.id });

      if (!room) {
        return res.status(404).send("404 Not Found: Room does not exist");
      }

      const update = {
        ...req.body,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      };

      const newRoom = await Room.findOneAndUpdate(
        { id: req.params.id },
        update
      );

      res.setHeader("Location", "/v1/rooms/" + newRoom!.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE an Room of id
 * @param {Number} id
 * @returns No Room or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "organizer"]),
  async (req, res, next) => {
    try {
      const deleteRoom = await Room.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteRoom) {
        return res.status(404).send("404 Not Found: Room does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
