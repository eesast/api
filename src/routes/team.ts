import express from "express";
import jwt from "jsonwebtoken";
import { docker_queue } from "..";
import authenticate from "../middlewares/authenticate";
import * as fs from "fs/promises";
import * as utils from "../helpers/utils";
import * as COS from "../helpers/cos";
import * as ContConf from "../configs/contest";
import * as ContHasFunc from "../hasura/contest"
import { messageReceiveTemplate } from "../helpers/htmlTemplates";

const router = express.Router();


// used in uploadmap.tsx
router.post("/add_contest_map", authenticate(), async (req, res) => {
    try {
        const { contest_id, name, filename, team_labels } = req.body;
        if (!contest_id || !name || !filename || !team_labels) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const map_id = await ContHasFunc.add_contest_map(contest_id, name, filename, team_labels);
        res.json({ map_id });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
         });
    }
});

// used in noticepage.tsx
router.post("/add_contest_notice", authenticate(), async (req, res) => {
    try {
        const { title, content, files, contest_id } = req.body;
        if (!title || !content || !contest_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const id = await ContHasFunc.add_contest_notice(title, content, files, contest_id);
        res.json({ id });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({             
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({            
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// used in Competition.tsx
router.post("/add_contest_round", authenticate(), async (req, res) => {
    try {
        const { contest_id, name, map_id } = req.body;
        if (!contest_id || !name || !map_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const round_id = await ContHasFunc.add_contest_round(contest_id, name, map_id);
        res.json({ round_id });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({             
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// used in codepage.tsx
router.post("/add_team_code", authenticate(), async (req, res) => {
    try {
        const { team_id, code_name, language, compile_status } = req.body;
        if (!team_id || !code_name || !language || !compile_status) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const code_id = await ContHasFunc.add_team_code(team_id, code_name, language, compile_status);
        res.status(200).json({ code_id:code_id,message:"Code added successfully" });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({            
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// used in joinpage.tsx
router.post("/add_team_player", authenticate(), async (req, res) => {
    try {
        const { team_id, player } = req.body;
        if (!team_id || !player) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const player_result = await ContHasFunc.add_team_player(team_id, player);
        res.status(200).json({ player: player_result,message:"Team Player Added Successfully" });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({            
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

router.post("/add_team", authenticate(), async (req, res) => {
    try {
        const { team_name, team_intro, team_leader_uuid, invited_code, contest_id } = req.body;
        if (!team_name || !team_intro || !team_leader_uuid || !invited_code || !contest_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const team_id = await ContHasFunc.add_team(team_name, team_intro, team_leader_uuid, invited_code, contest_id);
        res.status(200).json({ team_id: team_id,message:"Team Added Successfully" });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({             
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

router.post("/add_team_member", authenticate(), async (req, res) => {
    try {
        const { team_id, user_uuid } = req.body;
        if (!team_id || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const team_id_result = await ContHasFunc.add_team_member(team_id, user_uuid);
        res.status(200).json({ message:"Team Member Added Successfully",team_id: team_id_result });
    } catch (err:any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({             
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
});


// used in codepage.tsx
router.post("/update_team_code_name", authenticate(), async (req, res) => {
    try {
        const { code_id, code_name } = req.body;
        if (!code_id || !code_name) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_team_code_name = await ContHasFunc.update_team_code_name(code_id, code_name);
        res.status(200).json({ code_id: update_team_code_name.code_id,message:"Code Name Updated Successfully" });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// used in codepage.tsx
router.post("/update_team_player", authenticate(), async (req, res) => {
    try {
        const { team_id, player, code_id, role } = req.body;
        if (!team_id || !player || !code_id || !role) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_team_player = await ContHasFunc.update_team_player(team_id, player, code_id, role);
        res.status(200).json({ player: update_team_player.player,message:"Player Updated Successfully" });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// used in managepage.tsx
router.post("/update_team", authenticate(), async (req, res) => {
    try {
        const { team_id, team_name, team_intro } = req.body;
        if (!team_id || !team_name || !team_intro) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_team = await ContHasFunc.update_team(team_id, team_name, team_intro);
        res.status(200).json({ message:"Team Updated Successfully",team_id: update_team.team_id });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});



//used in codepage.tsx

router.post("/delete_team_code", authenticate(), async (req, res) => {
    try {
        const { code_id } = req.body;
        if (!code_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team_code = await ContHasFunc.delete_team_code(code_id);
        res.status(200).json({ code_id: delete_team_code,message:"Code Deleted Successfully" });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// used in managepage.tsx

router.post("/delete_team", authenticate(), async (req, res) => {
    try {
        const { team_id } = req.body;
        if (!team_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team = await ContHasFunc.delete_team(team_id);
        res.status(200).json({ team_id: delete_team, message:"Team Deleted Successfully" });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// used in managepage.tsx
router.post("/delete_team_member", authenticate(), async (req, res) => {
    try {
        const { user_uuid, team_id } = req.body;
        if (!user_uuid || !team_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_team_member = await ContHasFunc.delete_team_member(user_uuid, team_id);
        res.status(200).json({ team_id: delete_team_member,message:"Team Member Deleted Successfully" });
    } catch (err: any) {
        if (err.name === 'AuthenticationError') {
            return res.status(401).json({ error: "401 Unauthorized: Authentication failed" });
        }
        res.status(500).json({ 
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

export default router;