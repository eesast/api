import * as express from "express";
import { IAuthRequest } from "../config/jwt";
import authenticate from "../middlewares/authenticate";
import checkToken from "../middlewares/checkToken";
import Team, { ITeamModel } from "../models/team";
import User from "../models/user";

const router = express.Router();

/**
 * GET teams with queries
 * @param {number} contestId
 * @param {boolean} available - only get available teams if true
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} teams of given contest
 */
router.get(
  "/",
  checkToken,
  (
    req: {
      query: { [key: string]: string };
      auth: IAuthRequest;
    },
    res
  ) => {
    const query: {
      contestId?: number;
      available?: boolean;
      begin?: number;
      end?: number;
    } = {};
    if (req.query.contestId) {
      query.contestId = parseInt(req.query.contestId, 10);
    }
    if (req.query.available === "true") {
      query.available = true;
    }

    const begin = parseInt(req.query.begin, 10) || 0;
    const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
    const select =
      "-_id -__v" + (req.auth.role === "root" ? "" : " -inviteCode");

    Team.find(
      { ...query, members: { $nin: req.auth.id } },
      select,
      (err, teams) => {
        if (err) {
          return res.status(500).end();
        }

        Team.find(
          { ...query, members: { $in: req.auth.id } },
          "-_id -__v",
          (error, teamSelf) => {
            if (error) {
              return res.status(500).end();
            }

            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(200).end(
              JSON.stringify(
                teams
                  .concat(teamSelf)
                  .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                  .slice(begin, end)
              )
            );
          }
        );
      }
    );
  }
);

/**
 * GET team of Id
 * @param {number} id
 * @returns {Object} team with id
 */
router.get(
  "/:id",
  checkToken,
  (req: { params: { id: string }; auth: IAuthRequest }, res) => {
    Team.findOne({ id: req.params.id }, "-_id -__v", (err, team) => {
      if (err) {
        return res.status(500).end();
      }
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }

      if (req.auth.role !== "root") {
        if (!req.auth.id || team.members.indexOf(req.auth.id) === -1) {
          team.set("inviteCode", undefined);
        }
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(team));
    });
  }
);

/**
 * GET members of team of Id
 * @param {number} id
 * @returns {number[]}
 */
router.get("/:id/members/", (req: { params: { id: string } }, res) => {
  Team.findOne({ id: req.params.id }, "members", (err, team) => {
    if (err) {
      return res.status(500).end();
    }
    if (!team) {
      return res.status(404).send("404 Not Found: Team does not exist");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(team.members));
  });
});

/**
 * POST new team
 * @returns Location header & Invite code
 */
router.post(
  "/",
  authenticate([]),
  async (req: { body: Partial<ITeamModel>; auth: IAuthRequest }, res) => {
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

    delete req.body.id;
    if (req.auth.id) {
      req.body.members = [req.auth.id];
      req.body.leader = req.auth.id;
    }
    req.body.inviteCode = Math.random()
      .toString(36)
      .slice(2, 10);
    const newTeam = new Team(req.body);

    newTeam.save((err, team) => {
      if (err) {
        return res.status(500).end();
      }

      res.setHeader("Location", "/v1/teams/" + team.id);
      res.status(201).send({ inviteCode: team.inviteCode });
    });
  }
);

/**
 * POST add member to team of Id
 * @param {number} id
 * @param {string} inviteCode
 * @returns Location header
 */
router.post(
  "/:id/members/",
  authenticate(["root", "self"]),
  (
    req: {
      params: { id: string };
      body: { id: number; inviteCode: string };
      auth: IAuthRequest;
    },
    res
  ) => {
    Team.findOne({ id: req.params.id }, async (err, team) => {
      if (err) {
        return res.status(500).end();
      }
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
      if (!team.available) {
        return res.status(403).send("403 Forbidden: Team is not available");
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

      const members = team.members.concat([req.body.id]);
      const update = { updatedAt: new Date(), members };
      Team.findOneAndUpdate({ id: req.params.id }, update, (error, newTeam) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newTeam) {
          return res.status(404).send("404 Not Found: Team does not exist");
        }

        res.setHeader(
          "Location",
          "/v1/teams/" + team.id + "/members/" + req.body.id
        );
        res.status(201).end();
      });
    });
  }
);

/**
 * PUT existing team
 * @param {number} id - updating team's id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "self"]),
  (
    req: {
      params: { id: string };
      body: Partial<ITeamModel>;
      auth: IAuthRequest;
    },
    res
  ) => {
    Team.findOne({ id: req.params.id }, async (err, team) => {
      if (err) {
        return res.status(500).end();
      }
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
                    contestId: req.body.contestId,
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
          contestId: req.body.contestId,
          name: req.body.name
        }))
      ) {
        return res.status(409).send("409 Conflict: Team name already exists");
      }

      const members = req.body.members || team.members;
      if (members.indexOf(req.body.leader || team.leader) === -1) {
        return res
          .status(400)
          .send("400 Bad Request: Captain is not a member of the team");
      }

      const update = { updatedAt: new Date(), ...req.body };
      Team.findOneAndUpdate({ id: req.params.id }, update, (error, newTeam) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newTeam) {
          return res.status(404).send("404 Not Found: Team does not exist");
        }

        res.setHeader("Location", "/v1/teams/" + newTeam.id);
        res.status(204).end();
      });
    });
  }
);

/**
 * DELETE a team of Id
 * @param {number} id - deleting team's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "self"]),
  (req: { params: { id: string }; auth: IAuthRequest }, res) => {
    Team.findOne({ id: req.params.id }, (err, team) => {
      if (err) {
        return res.status(500).end();
      }
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      }
      if (req.auth.selfCheckRequired) {
        if (team.leader !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }

      Team.findOneAndDelete({ id: req.params.id }, (error, deleteTeam) => {
        if (error) {
          return res.status(500).end();
        }
        if (!deleteTeam) {
          return res.status(404).send("404 Not Found: Team does not exist");
        }

        res.status(204).end();
      });
    });
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
  authenticate(["root", "self"]),
  (
    req: { params: { id: string; memberId: string }; auth: IAuthRequest },
    res
  ) => {
    Team.findOne({ id: req.params.id }, (err, team) => {
      if (err) {
        return res.status(500).end();
      }
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
      const update = { updatedAt: new Date(), members: team.members };
      Team.findOneAndUpdate({ id: req.params.id }, update, (error, newTeam) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newTeam) {
          return res.status(404).send("404 Not Found: Team does not exist");
        }

        res.status(204).end();
      });
    });
  }
);

export default router;
