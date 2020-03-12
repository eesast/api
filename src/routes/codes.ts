import express from "express";
import authenticate from "../middlewares/authenticate";
import Code from "../models/code";
import Team from "../models/team";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET codes with queries
 * @param {number} contestId
 * @param {number} teamId
 * @param {number} begin
 * @param {number} end
 * @returns {Object[]} certain codes
 */
router.get("/", authenticate([]), async (req, res, next) => {
  try {
    const query = {
      ...pick(req.query, ["contestId", "teamId"])
    };

    const begin = parseInt(req.query.begin, 10) || 0;
    const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
    const select = "-_id -__v";

    const userId = req.auth.id;
    if (query.teamId) {
      const team = await Team.findOne({ id: query.teamId });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exist");
      } else if (
        team.members.includes(userId!) ||
        req.auth.role === "root" ||
        req.auth.role === "organizer"
      ) {
        const codes = await Code.find({ ...query }, select, {
          skip: begin,
          limit: end - begin + 1,
          sort: "-createdAt"
        });
        return res.json(codes);
      } else {
        return res
          .status(403)
          .send("403 Forbidden: You have no access to codes");
      }
    } else if (
      query.contestId &&
      (req.auth.role === "root" || req.auth.role === "organizer")
    ) {
      const codes = await Code.find({ ...query }, select, {
        skip: begin,
        limit: end - begin + 1,
        sort: "-createdAt"
      });
      return res.json(codes);
    } else {
      if (req.auth.role === "root") {
        const codes = await Code.find({ ...query }, select, {
          skip: begin,
          limit: end - begin + 1,
          sort: "-createdAt"
        });
        return res.json(codes);
      }
      return res.status(422).send("422 UnProcessable Entity: Missing contents");
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET code of Id
 * @param {number} id
 * @returns {Object} code with id
 */
router.get("/:id", authenticate([]), async (req, res, next) => {
  try {
    const userId = req.auth.id;

    const code = await Code.findOne({ id: req.params.id }, "-_id -__v");
    if (!code) {
      return res.status(404).send("404 Not Found: Code does not exits");
    }

    const team = await Team.findOne({ id: code?.teamId });

    if (team?.members.includes(userId!)) {
      res.json(code);
    } else {
      res.status(403).send("403 Forbidden: You have no access to the code");
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST new code
 * @returns Location header
 */
router.post("/", authenticate(["root", "self"]), async (req, res, next) => {
  try {
    if (req.body.content === "") {
      return res.status(422).send("422 UnProcessable Entity: Missing contents");
    }

    const team = await Team.findOne({ id: req.body.teamId });
    if (!team) {
      return res.status(404).send("404 Not Found: Team does not exits");
    } else if (team.contestId !== req.body.contestId) {
      return res
        .status(403)
        .send("403 Forbidden: Team and Contest do not match");
    } else if (
      !team.members.includes(req.auth.id!) &&
      req.auth.role !== "root"
    ) {
      return res.status(403).send("403 Forbidden: You have no access");
    }

    const code = await new Code({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    res.setHeader("Location", "/v1/codes/" + code.id);
    res.status(201).end();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT existing code
 * @param {number} id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "self", "organizer"]),
  async (req, res, next) => {
    try {
      const code = await Code.findOne({ id: req.params.id });

      if (!code) {
        return res.status(404).send("404 Not Found: Code does not exits");
      }

      const team = await Team.findOne({ id: code.teamId! });
      if (!team) {
        return res.status(404).send("404 Not Found: Team does not exits");
      }

      if (!team.members.includes(req.auth.id!) || req.auth.role !== "root") {
        return res.status(403).send("404 Not Found: Team does not exits");
      }

      const update = {
        ...req.body,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      };
      const newCode = await Code.findOneAndUpdate(
        { id: req.params.id },
        update
      );
      res.setHeader("Location", "/v1/codes/" + newCode!.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE a code of id
 * @param {Number} id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "self"]),
  async (req, res, next) => {
    try {
      if (req.auth.selfCheckRequired) {
        const teamId = (await Code.findOne({ id: req.params.id }))?.teamId;

        if (
          !(await Team.findOne({ id: teamId }))?.members.includes(req.auth.id!)
        ) {
          return res.status(403).send("404 Not Found: Team does not exits");
        }
      }

      const deleteCode = await Code.findOneAndDelete({ id: req.params.id });

      if (!deleteCode) {
        return res.status(404).send("404 Not Found: Article does not exist");
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
