import * as MentHasFunc from "../hasura/mentor";
import express from "express";
import authenticate from "../middlewares/authenticate";

const router = express.Router();
//TODO:find out what does this do, need to check auth
router.post("/insert/info", authenticate(["counselor", "teacher"]), async (req, res) => {
  try {
    const uuid: string = req.body.uuid;
    if (!uuid) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const updated_at = await MentHasFunc.insert_mentor_info(uuid);
    return res.status(200).send(updated_at);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/update/available", authenticate(["counselor", "teacher"]), async (req, res) => {
  try {
    const uuid: string = req.body.uuid;
    const available: boolean = req.body.available;
    if (!uuid || available === undefined || available === null) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const mentor_available = await MentHasFunc.update_mentor_info_available(uuid, available);
    return res.status(200).json({mentor_available: mentor_available});
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});
router.post("/update/description", authenticate(["teacher", "counselor"]), async (req, res) => {
  try {
    const uuid: string = req.body.uuid;
    const description: string = req.body.description;
    const achievement: string = req.body.achievement;
    const background: string = req.body.background;
    const field: string = req.body.field;
    const intro: string = req.body.intro;
    //using partial
    const updateFields : any = {};
    if (description) updateFields.description = description;
    if (achievement) updateFields.achievement = achievement;
    if (background) updateFields.background = background;
    if (field) updateFields.field = field;
    if (intro) updateFields.intro = intro;
    if (!uuid||updateFields.length === 0) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const mentor_uuid: string = await MentHasFunc.update_mentor_info_description(uuid,updateFields);
    return res.status(200).send(mentor_uuid);
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
