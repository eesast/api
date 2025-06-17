import express from "express";
import authenticate from "../middlewares/authenticate";
import * as ContHasFunc from "../hasura/contest";

const router = express.Router();

router.post("/member_limit", authenticate(), async (req, res) => {
  try {
    const { contest_id } = req.body;
    if (!contest_id) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing required parameters" });
    }
    const limit = await ContHasFunc.get_contest_member_limit(contest_id);
    res.status(200).json({ limit: limit });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// used in codepage.tsx
router.post("/add_team_code", authenticate(["student"]), async (req, res) => {
  try {
    const {
      team_id,
      code_name,
      language,
      compile_status,
      user_id,
      contest_id,
    } = req.body;
    if (!team_id || !code_name || !language || !compile_status) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing required parameters" });
    }

    // 获取团队信息
    const teamInfo = await ContHasFunc.get_team_from_user(user_id, contest_id);
    if (!teamInfo) {
      return res.status(404).json({ error: "404 Not Found: Team not found" });
    }
    // 判断是否是团队成员
    if (teamInfo.team_id !== team_id) {
      return res
        .status(403)
        .json({ error: "403 Forbidden: You are not in this team" });
    }

    const code_id = await ContHasFunc.add_team_code(
      team_id,
      code_name,
      language,
      compile_status,
    );
    res
      .status(200)
      .json({ code_id: code_id, message: "Code added successfully" });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// used in joinpage.tsx
router.post("/add_team_player", authenticate(["student"]), async (req, res) => {
  try {
    const { team_id, player } = req.body;
    if (!team_id || !player) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing required parameters" });
    }
    const player_result = await ContHasFunc.add_team_player(team_id, player);
    res.status(200).json({
      player: player_result,
      message: "Team Player Added Successfully",
    });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

router.post("/add_team", authenticate(["student"]), async (req, res) => {
  try {
    const {
      team_name,
      team_intro,
      team_leader_uuid,
      invited_code,
      contest_id,
    } = req.body;
    if (!team_name || !team_intro || !invited_code || !contest_id) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing required parameters" });
    } else if (!team_leader_uuid) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing Team Leader UUID" });
    }
    // else if(!isValid(contest_id)){
    //}
    const team_id = await ContHasFunc.add_team(
      team_name,
      team_intro,
      team_leader_uuid,
      invited_code,
      contest_id,
    );
    res
      .status(200)
      .json({ team_id: team_id, message: "Team Added Successfully" });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

router.post("/add_team_member", authenticate(["student"]), async (req, res) => {
  try {
    const team_id = req.body.team_id;
    const user_uuid = req.body.user_uuid;
    if (!team_id || !user_uuid) {
      return res
        .status(400)
        .json({ error: "400 Bad Request: Missing required parameters" });
    }
    const result = await ContHasFunc.add_team_member(team_id, user_uuid);
    if (!result) {
      return res.status(551).json({ error: "551: Team member limit reached" });
    }
    return res.status(200).json({
      message: "Team Member Added Successfully",
    });
  } catch (err: any) {
    if (err.name === "TeamPlayerLimitError") {
      return res.status(551).json({ error: "551: Team member limit reached" });
    }
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// used in codepage.tsx
router.post(
  "/update_team_code_name",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const { code_id, code_name } = req.body;
      if (!code_id || !code_name) {
        return res
          .status(400)
          .json({ error: "400 Bad Request: Missing required parameters" });
      }
      const update_team_code_name = await ContHasFunc.update_team_code_name(
        code_id,
        code_name,
      );
      res.status(200).json({
        code_id: update_team_code_name.code_id,
        message: "Code Name Updated Successfully",
      });
    } catch (err: any) {
      res.status(500).json({
        error: "500 Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  },
);

// used in codepage.tsx
router.post(
  "/update_team_player",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const { team_id, player, code_id, role } = req.body;
      if (!team_id || !player || !code_id || !role) {
        return res
          .status(400)
          .json({ error: "400 Bad Request: Missing required parameters" });
      }
      const update_team_player = await ContHasFunc.update_team_player(
        team_id,
        player,
        code_id,
        role,
      );
      res.status(200).json({
        player: update_team_player.player,
        message: "Player Updated Successfully",
      });
    } catch (err: any) {
      res.status(500).json({
        error: "500 Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  },
);

// used in managepage.tsx
router.post("/update_team", authenticate(["student"]), async (req, res) => {
  try {
    const { team_id, ...update_Fields } = req.body;
    if (!team_id) {
      return res.status(400).json({
        error: "400 Bad Request: Missing required parameters(team_id)",
      });
    }
    const update_team = await ContHasFunc.update_team(team_id, update_Fields);
    res.status(200).json({
      message: "Team Updated Successfully",
      team_id: update_team.team_id,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

//used in codepage.tsx

router.post(
  "/delete_team_code",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const { code_id } = req.body;
      if (!code_id) {
        return res
          .status(400)
          .send("400 Bad Request: Missing required parameters");
      }
      const delete_team_code = await ContHasFunc.delete_team_code(code_id);
      res.status(200).json({
        code_id: delete_team_code,
        message: "Code Deleted Successfully",
      });
    } catch (err: any) {
      res.status(500).json({
        error: "500 Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  },
);

// used in managepage.tsx

router.post("/delete_team", authenticate(["student"]), async (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) {
      return res
        .status(400)
        .send("400 Bad Request: Missing required parameters");
    }
    const delete_team = await ContHasFunc.delete_team(team_id);
    res
      .status(200)
      .json({ team_id: delete_team, message: "Team Deleted Successfully" });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// used in managepage.tsx
router.post(
  "/delete_team_member",
  authenticate(["student"]),
  async (req, res) => {
    try {
      const { user_uuid, team_id } = req.body;
      if (!user_uuid || !team_id) {
        return res
          .status(400)
          .send("400 Bad Request: Missing required parameters");
      }
      const delete_team_member = await ContHasFunc.delete_team_member(
        user_uuid,
        team_id,
      );
      res.status(200).json({
        team_id: delete_team_member,
        message: "Team Member Deleted Successfully",
      });
    } catch (err: any) {
      res.status(500).json({
        error: "500 Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  },
);

export default router;
