import express from "express";
import authenticate from "../middlewares/authenticate";

import * as ContHasFunc from "../hasura/contest"

const router = express.Router();

// used in uploadmap.tsx
router.post("/add_contest_map", authenticate(), async (req, res) => {
    try {
        const { contest_id, name, filename, team_labels } = req.body;
        if (!contest_id || !name || !filename || !team_labels) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const map_id = await ContHasFunc.add_contest_map(contest_id, name, filename, team_labels);
        res.status(200).json({ map_id:map_id,message:"Contest Map Added Successfully" });
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
        res.status(200).json({ id:id,message:"Contest Notice Added Successfully" });
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
        res.status(200).json({ round_id:round_id,message:"Contest Round Added Successfully" });
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

// used in edittimeline.tsx
router.post("/add_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event, start, end, description } = req.body;
        if (!contest_id || !event || !start || !end) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const event_result = await ContHasFunc.add_contest_time(contest_id, event, start, end, description);
        res.status(200).json({ event: event_result,message:"Contest Time Added Successfully" });
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


// used in editinfo.tsx
router.post("/update_contest_info", authenticate(), async (req, res) => {
    try {
        const { contest_id, fullname, description, start_date, end_date } = req.body;
        if (!contest_id || !fullname || !description || !start_date || !end_date) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_info = await ContHasFunc.update_contest_info(contest_id, fullname, description, start_date, end_date);
        res.status(200).json({ id: update_contest_info.id, message:"Contest Info Added Successfully" 
        });

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

// used in setting.tsx
router.post("/update_contest_switch", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_switch, code_upload_switch, arena_switch, playground_switch, stream_switch, playback_switch } = req.body;
        if (!contest_id || team_switch === undefined || code_upload_switch === undefined || arena_switch === undefined || playground_switch === undefined || stream_switch === undefined || playback_switch === undefined) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_switch = await ContHasFunc.update_contest_switch(contest_id, team_switch, code_upload_switch, arena_switch, playground_switch, stream_switch, playback_switch);
        res.status(200).json({ id: update_contest_switch.id, message:"Contest Switch Updated Successfully"});
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

router.post("/update_contest_map", authenticate(), async (req, res) => {
    try {
        const { map_id, name, filename, team_labels } = req.body;
        if (!map_id || !name || !filename || !team_labels) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_map = await ContHasFunc.update_contest_map(map_id, name, filename, team_labels);
        res.json({ map_id: update_contest_map.map_id });
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


//used in noticepage.tsx
router.post("/update_contest_notice", authenticate(), async (req, res) => {
    try {
        const { id, title, content, files } = req.body;
        if (!id || !title || !content) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_notice = await ContHasFunc.update_contest_notice(id, title, content, files);
        res.status(200).json({ id: update_contest_notice.id, message:"Contest Notice Updated Successfully" });
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
router.post("/update_contest_player", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_label, player_label, roles_available } = req.body;
        if (!contest_id || !team_label || !player_label || !roles_available) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_player = await ContHasFunc.update_contest_player(contest_id, team_label, player_label, roles_available);
        res.json({ team_label: update_contest_player.team_label });
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

router.post("/update_contest_round_name", authenticate(), async (req, res) => {
    try {
        const { round_id, name } = req.body;
        if (!round_id || !name) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_round_name = await ContHasFunc.update_contest_round_name(round_id, name);
        res.json({ round_id: update_contest_round_name.round_id });
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

router.post("/update_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event, start, end, description } = req.body;
        if (!contest_id || !event || !start || !end || !description) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const update_contest_time = await ContHasFunc.update_contest_time(contest_id, event, start, end, description);
        res.json({ event: update_contest_time.event });
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

router.post("/delete_contest", authenticate(), async (req, res) => {
    try {
        const { contest_id } = req.body;
        if (!contest_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const delete_contest = await ContHasFunc.delete_contest(contest_id);
        res.json({ affected_rows: delete_contest });
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

// used in uploadmap.tsx

router.post("/delete_contest_map", authenticate(), async (req, res) => {
    try {
        const { map_id } = req.body;
        if (!map_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const delete_contest_map = await ContHasFunc.delete_contest_map(map_id);
        res.status(200).json({ map_id: delete_contest_map, message:"Contest Map Deleted Successfully" });
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


// used in noticepage.tsx
router.post("/delete_contest_notice", authenticate(), async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const delete_contest_notice = await ContHasFunc.delete_contest_notice(id);
        res.status(200).json({ id: delete_contest_notice, message:"Contest Notice Deleted Successfully" });
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

router.post("/delete_contest_player", authenticate(), async (req, res) => {
    try {
        const { contest_id, team_label, player_label } = req.body;
        if (!contest_id || !team_label || !player_label) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const delete_contest_player = await ContHasFunc.delete_contest_player(contest_id, team_label, player_label);
        res.json({ team_label: delete_contest_player });
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


router.post("/delete_contest_round", authenticate(), async (req, res) => {
    try {
        const { round_id } = req.body;
        if (!round_id) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_round = await ContHasFunc.delete_contest_round(round_id);
        res.json({ round_id: delete_contest_round });
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


router.post("/delete_contest_time", authenticate(), async (req, res) => {
    try {
        const { contest_id, event } = req.body;
        if (!contest_id || !event) {
            return res.status(400).send("400 Bad Request: Missing required parameters");
        }
        const delete_contest_time = await ContHasFunc.delete_contest_time(contest_id, event);
        res.json({ event: delete_contest_time });
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