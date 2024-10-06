import express from "express";
import jwt from "jsonwebtoken";
import { docker_queue } from "..";
import authenticate from "../middlewares/authenticate";
import * as fs from "fs/promises";
import * as utils from "../helpers/utils";
import * as COS from "../helpers/cos";
import * as ContConf from "../configs/contest";
import * as ContHasFunc from "../hasura/contest"

const router = express.Router();

router.post("/add_contest_map", authenticate(), async (req, res) => {
    try {
        const { contest_id, name, filename, team_labels } = req.body;
        if (!contest_id || !name || !filename || !team_labels) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const map_id = await ContHasFunc.add_contest_map(contest_id, name, filename, team_labels);
        res.json({ map_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_contest_notice", authenticate(), async (req, res) => {
    try {
        const { title, content, files, contest_id } = req.body;
        if (!title || !content || !contest_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const id = await ContHasFunc.add_contest_notice(title, content, files, contest_id);
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_contest_player", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_label, player_label, roles_available } = req.body;
        if (!contest_id || !team_label || !player_label || !roles_available) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const team_label_result = await ContHasFunc.add_contest_player(contest_id, team_label, player_label, roles_available);
        res.json({ team_label: team_label_result });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_contest_round", authenticate(), async (req, res) => {
    try {
        const { contest_id, name, map_id } = req.body;
        if (!contest_id || !name || !map_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const round_id = await ContHasFunc.add_contest_round(contest_id, name, map_id);
        res.json({ round_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_team_code", authenticate(), async (req, res) => {
    try {
        const { team_id, code_name, language, compile_status } = req.body;
        if (!team_id || !code_name || !language || !compile_status) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const code_id = await ContHasFunc.add_team_code(team_id, code_name, language, compile_status);
        res.json({ code_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_team_player", authenticate(), async (req, res) => {
    try {
        const { team_id, player } = req.body;
        if (!team_id || !player) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const player_result = await ContHasFunc.add_team_player(team_id, player);
        res.json({ player: player_result });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_team", authenticate(), async (req, res) => {
    try {
        const { team_name, team_intro, team_leader_uuid, invited_code, contest_id } = req.body;
        if (!team_name || !team_intro || !team_leader_uuid || !invited_code || !contest_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const team_id = await ContHasFunc.add_team(team_name, team_intro, team_leader_uuid, invited_code, contest_id);
        res.json({ team_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_team_member", authenticate(), async (req, res) => {
    try {
        const { team_id, user_uuid } = req.body;
        if (!team_id || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const team_id_result = await ContHasFunc.add_team_member(team_id, user_uuid);
        res.json({ team_id: team_id_result });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/add_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event, start, end, description } = req.body;
        if (!contest_id || !event || !start || !end) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const event_result = await ContHasFunc.add_contest_time(contest_id, event, start, end, description);
        res.json({ event: event_result });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_info", authenticate(), async (req, res) => {
    try {
        const { contest_id, fullname, description, start_date, end_date } = req.body;
        if (!contest_id || !fullname || !description || !start_date || !end_date) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_info = await ContHasFunc.update_contest_info(contest_id, fullname, description, start_date, end_date);
        res.json({ id: update_contest_info.id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_switch", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_switch, code_upload_switch, arena_switch, playground_switch, stream_switch, playback_switch } = req.body;
        if (!contest_id || team_switch === undefined || code_upload_switch === undefined || arena_switch === undefined || playground_switch === undefined || stream_switch === undefined || playback_switch === undefined) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_switch = await ContHasFunc.update_contest_switch(contest_id, team_switch, code_upload_switch, arena_switch, playground_switch, stream_switch, playback_switch);
        res.json({ id: update_contest_switch.id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_map", authenticate(), async (req, res) => {
    try {
        const { map_id, name, filename, team_labels } = req.body;
        if (!map_id || !name || !filename || !team_labels) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_map = await ContHasFunc.update_contest_map(map_id, name, filename, team_labels);
        res.json({ map_id: update_contest_map.map_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_notice", authenticate(), async (req, res) => {
    try {
        const { id, title, content, files } = req.body;
        if (!id || !title || !content) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_notice = await ContHasFunc.update_contest_notice(id, title, content, files);
        res.json({ id: update_contest_notice.id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_player", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_label, player_label, roles_available } = req.body;
        if (!contest_id || !team_label || !player_label || !roles_available) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_player = await ContHasFunc.update_contest_player(contest_id, team_label, player_label, roles_available);
        res.json({ team_label: update_contest_player.team_label });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_contest_round_name", authenticate(), async (req, res) => {
    try {
        const { round_id, name } = req.body;
        if (!round_id || !name) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_round_name = await ContHasFunc.update_contest_round_name(round_id, name);
        res.json({ round_id: update_contest_round_name.round_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_team_code_name", authenticate(), async (req, res) => {
    try {
        const { code_id, code_name } = req.body;
        if (!code_id || !code_name) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_team_code_name = await ContHasFunc.update_team_code_name(code_id, code_name);
        res.json({ code_id: update_team_code_name.code_id });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});

router.post("/update_team_player", authenticate(), async (req, res) => {
    try {
        const { team_id, player, code_id, role } = req.body;
        if (!team_id || !player || !code_id || !role) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_team_player = await ContHasFunc.update_team_player(team_id, player, code_id, role);
        res.json({ player: update_team_player.player });
    } catch (err) {
        res.status(500).json({ error: "500 Internal Server Error" });
    }
});



router.post("/update_team", authenticate(), async (req, res) => {
    try {
        const { team_id, team_name, team_intro } = req.body;
        if (!team_id || !team_name || !team_intro) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const update_team = await ContHasFunc.update_team(team_id, team_name, team_intro);
        res.json({ team_id: update_team.team_id });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/update_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event, start, end, description } = req.body;
        if (!contest_id || !event || !start || !end || !description) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const update_contest_time = await ContHasFunc.update_contest_time(contest_id, event, start, end, description);
        res.json({ event: update_contest_time.event });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest", authenticate(), async (req, res) => {
    try {
        const { contest_id } = req.body;
        if (!contest_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest = await ContHasFunc.delete_contest(contest_id);
        res.json({ affected_rows: delete_contest });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest_map", authenticate(), async (req, res) => {
    try {
        const { map_id } = req.body;
        if (!map_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_map = await ContHasFunc.delete_contest_map(map_id);
        res.json({ map_id: delete_contest_map });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest_notice", authenticate(), async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_notice = await ContHasFunc.delete_contest_notice(id);
        res.json({ id: delete_contest_notice });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest_player", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_label, player_label } = req.body;
        if (!contest_id || !team_label || !player_label) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_player = await ContHasFunc.delete_contest_player(contest_id, team_label, player_label);
        res.json({ team_label: delete_contest_player });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest_round", authenticate(), async (req, res) => {
    try {
        const { round_id } = req.body;
        if (!round_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_round = await ContHasFunc.delete_contest_round(round_id);
        res.json({ round_id: delete_contest_round });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_team_code", authenticate(), async (req, res) => {
    try {
        const { code_id } = req.body;
        if (!code_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team_code = await ContHasFunc.delete_team_code(code_id);
        res.json({ code_id: delete_team_code });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_team", authenticate(), async (req, res) => {
    try {
        const { team_id } = req.body;
        if (!team_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team = await ContHasFunc.delete_team(team_id);
        res.json({ team_id: delete_team });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_team_member", authenticate(), async (req, res) => {
    try {
        const { user_uuid, team_id } = req.body;
        if (!user_uuid || !team_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team_member = await ContHasFunc.delete_team_member(user_uuid, team_id);
        res.json({ team_id: delete_team_member });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});

router.post("/delete_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event } = req.body;
        if (!contest_id || !event) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_time = await ContHasFunc.delete_contest_time(contest_id, event);
        res.json({ event: delete_contest_time });
    } catch (err) {
        res.status(500).send("500 Internal Server Error");
    }
});


export default router;