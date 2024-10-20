import * as MentHasFunc from "../hasura/mentor";
import express from "express";
import authenticate from "../middlewares/authenticate";

const router = express.Router();
//TODO:find out what does this do, need to check auth
router.post("/update/application/available", authenticate(), async (req, res) => {
    try {
        const uuid = req.body.uuid;
        if(!uuid){
            return res.status(422).send("422 Unprocessable Entity: Missing credentials");
        }
        const updated_at = await MentHasFunc.insert_mentor_info(uuid);
        return res.status(200).send(updated_at);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});

router.post("/update/available",authenticate(), async (req, res) => {
    try {
        const uuid = req.body.uuid;
        const available = req.body.available;
        if(!uuid || available === undefined){
            return res.status(422).send("422 Unprocessable Entity: Missing credentials");
        }
        const mentor_available = await MentHasFunc.update_mentor_info_available(uuid, available);
        return res.status(200).send(mentor_available);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});
router.post("/update/description",authenticate(), async (req, res) => {
    try {
        const uuid = req.body.uuid;
        const description = req.body.description;
        const achievements = req.body.achievements;
        const background = req.body.background;
        const field = req.body.field;
        const intro = req.body.intro;
        const max_applicants = req.body.max_applicants;
        if(!uuid || !description || !achievements || !background || !field || !intro || !max_applicants){
            return res.status(422).send("422 Unprocessable Entity: Missing credentials");
        }
        const mentor_info = MentHasFunc.get_mentor_info(uuid);
        if(!mentor_info){
            return res.status(404).send("404 Not Found: Mentor does not exist");
        }
        const mentor_uuid = await MentHasFunc.update_mentor_info_description(uuid, achievements, background, field, intro, max_applicants);
        return res.status(200).send(mentor_uuid);
    } catch (err) {
        return res.status(500).send("Internal Server Error");
    }
});

export default router;
