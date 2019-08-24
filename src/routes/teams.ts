import express from "express";
import authenticate from "../middlewares/authenticate";
import Team, { TeamModel } from "../models/team";
import User from "../models/user";
import pick from "lodash.pick";
import checkToken from "../middlewares/checkToken";

const router = express.Router();

/**
 * GET teams with queries
 * @param {number} contestId
 * @param {boolean} self - only get team with self if true
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} teams of given contest
 */
router.get("/", checkToken, async (req, res, next) => {
  const query = pick(req.query, ["contestId"]);

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;

  const select =
    "-_id -__v" +
    (req.auth.role === "root" || req.auth.role === "organizer"
      ? ""
      : " -inviteCode");

  let teams: TeamModel[] = [];
  let teamSelf: TeamModel[] = [];
  try {
    if (req.query.self !== "true") {
      teams = await Team.find(
        { ...query, members: { $nin: req.auth.id } },
        select
      );
    }
    teamSelf = await Team.find(
      { ...query, members: { $in: req.auth.id } },
      "-_id -__v"
    );

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(
      teams
        .concat(teamSelf)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(begin, end)
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET team of Id
 * @param {number} id
 * @returns {Object} team with id
 */
router.get("/:id", checkToken, async (req, res, next) => {
  try {
    const team = await Team.findOne({ id: req.params.id }, "-_id -__v");

    if (!team) {
      return res.status(404).send("404 Not Found: Team does not exist");
    }

    if (req.auth.role !== "root" && req.auth.role !== "organizer") {
      if (team.members.indexOf(req.auth.id!) === -1) {
        team.set("inviteCode", undefined);
      }
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET members of team of Id
 * @param {number} id
 * @returns {number[]}
 */
router.get("/:id/members", async (req, res, next) => {
  try {
    const team = await Team.findOne({ id: req.params.id }, "members");

    if (!team) {
      return res.status(404).send("404 Not Found: Team does not exist");
    }

    res.json(team.members);
  } catch (err) {
    next(err);
  }
});

/**
 * POST new team
 * @returns Location header & Invite code
 */
router.post("/", authenticate([]), async (req, res, next) => {
  try {
    if (
      await Team.findOne({ contestId: req.body.contestId, name: req.body.name })
    ) {
      res.setHeader("Location", "/teams");
      return res.status(409).send("409 Conflict: Team name already exists");
    }
    if (
      await Team.findOne({
        contestId: req.body.contestId,
        members: { $in: req.auth.id }
      })
    ) {
      res.setHeader("Location", "/teams");
      return res.status(409).send("409 Conflict: User is already in a team");
    }

    const { id, ...body } = req.body;

    if (req.auth.id) {
      body.members = [req.auth.id];
      body.leader = req.auth.id;
    }
    body.inviteCode = Math.random()
      .toString(36)
      .slice(2, 10);

    const newTeam = await new Team(body).save();
    res.setHeader("Location", "/v1/teams/" + newTeam.id);
    res.status(201).send({ inviteCode: newTeam.inviteCode });
  } catch (err) {
    next(err);
  }
});

/**
 * POST add member to team of Id
 * @param {number} id
 * @param {string} inviteCode
 * @returns Location header
 */
router.post(
  "/:id/members/",
  authenticate(["root", "self", "organizer"]),
  async (req, res, next) => {
    let members: number[];
    let update: { updatedAt: Date; members: number[] };
    try {
      const team = await Team.findOne({ id: req.params.id });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }
      if (req.auth.selfCheckRequired) {
        if (!req.body.inviteCode) {
          return res
            .status(422)
            .send("422 Unprocessable Entity: Missing credentials");
        }
        if (team.inviteCode !== req.body.inviteCode) {
          return res.status(403).send("403 Forbidden: Incorrect invite code");
        }
        if (req.auth.id !== req.body.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }
      if (team.members.length > 3) {
        return res
          .status(409)
          .send("409 Conflict: The number of members exceeds");
      }
      if (
        await Team.findOne({
          contestId: team.contestId,
          members: { $in: req.body.id }
        })
      ) {
        return res.status(409).send("409 Conflict: User is already in a team");
      }
      if (
        !(await User.findOne({
          id: req.body.id
        }))
      ) {
        return res.status(400).send("400 Bad Request: Member does not exist");
      }

      members = team.members.concat([req.body.id]);
      update = { updatedAt: new Date(), members };
    } catch (err) {
      return next(err);
    }

    try {
      const newTeam = await Team.findOneAndUpdate(
        { id: req.params.id },
        update
      );
      if (!newTeam) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      res.setHeader(
        "Location",
        "/v1/teams/" + req.params.id + "/members/" + req.body.id
      );
      res.status(201).end();
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT existing team
 * @param {number} id - updating team's id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "self", "organizer"]),
  async (req, res, next) => {
    let members: number[];
    let update: Partial<TeamModel>;
    try {
      const team = await Team.findOne({ id: req.params.id });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }
      if (req.auth.selfCheckRequired) {
        delete req.body.leader;
        delete req.body.members;
        delete req.body.available;
        if (team.leader !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }

      delete req.body.id;
      delete req.body.contestId;
      delete req.body.inviteCode;
      delete req.body.createdAt;
      delete req.body.createdBy;

      if (req.body.members) {
        let isMemberValid: boolean | null = req.body.members.length < 5;
        isMemberValid =
          isMemberValid &&
          (await req.body.members.reduce(
            (prev: Promise<boolean | null>, cur: number) =>
              prev.then(
                async Valid =>
                  Valid &&
                  (await User.findOne({ id: cur })) &&
                  !(await Team.findOne({
                    id: { $ne: req.params.id },
                    contestId: team.contestId,
                    members: { $in: cur }
                  }))
              ),
            Promise.resolve<boolean | null>(true)
          ));
        if (!isMemberValid) {
          return res.status(400).send("400 Bad Request: Invalid members");
        }
      }
      if (
        req.body.name !== team.name &&
        (await Team.findOne({
          contestId: team.contestId,
          name: req.body.name
        }))
      ) {
        return res.status(409).send("409 Conflict: Team name already exists");
      }

      members = req.body.members || team.members;
      if (members.indexOf(req.body.leader || team.leader) === -1) {
        return res
          .status(400)
          .send("400 Bad Request: Captain is not a member of the team");
      }

      update = { updatedAt: new Date(), ...req.body };
    } catch (err) {
      return next(err);
    }

    try {
      const newTeam = await Team.findOneAndUpdate(
        { id: req.params.id },
        update
      );
      if (!newTeam) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      res.setHeader("Location", "/v1/teams/" + newTeam.id);
      res.status(204).end();
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE a team of Id
 * @param {number} id - deleting team's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "self", "organizer"]),
  async (req, res, next) => {
    try {
      const team = await Team.findOne({ id: req.params.id });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }
      if (req.auth.selfCheckRequired) {
        if (team.leader !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }
    } catch (err) {
      return next(err);
    }

    try {
      const deleteTeam = await Team.findOneAndDelete({ id: req.params.id });
      if (!deleteTeam) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      res.status(204).end();
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE a member of memberId in team of id
 * @param {number} id - team's id
 * @param {number} memberId - deleting member's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id/members/:memberId",
  authenticate(["root", "self", "organizer"]),
  async (req, res, next) => {
    let update: { updatedAt: Date; members: number[] };
    try {
      const team = await Team.findOne({ id: req.params.id });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      const memberId = parseInt(req.params.memberId, 10);
      const index = team.members.indexOf(memberId);
      if (index === -1) {
        return res.status(404).send("404 Not Found: Member does not exist");
      }
      if (req.auth.selfCheckRequired) {
        if (team.leader !== req.auth.id && memberId !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }
      if (team.leader === memberId) {
        return res
          .status(400)
          .send("400 Bad Request: Leader cannot be deleted");
      }

      team.members.splice(index, 1);
      update = { updatedAt: new Date(), members: team.members };
    } catch (err) {
      return next(err);
    }

    try {
      const newTeam = await Team.findOneAndUpdate(
        { id: req.params.id },
        update
      );
      if (!newTeam) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      res.status(204).end();
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
