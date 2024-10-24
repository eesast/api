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
    if (!uuid || available === undefined) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const mentor_available = await MentHasFunc.update_mentor_info_available(uuid, available);
    return res.status(200).send(mentor_available);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});
router.post("/update/description", authenticate(["teacher", "counselor"]), async (req, res) => {
  try {
    const uuid: string = req.body.uuid;
    const description: string = req.body.description;
    const achievements: string = req.body.achievements;
    const background: string = req.body.background;
    const field: string = req.body.field;
    const intro: string = req.body.intro;
    if (!uuid || !description || !achievements || !background || !field || !intro) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    //const mentor_info = MentHasFunc.get_mentor_info(uuid);
    //if(!mentor_info){
    //    return res.status(404).send("404 Not Found: Mentor does not exist");
    //}
    const mentor_uuid: string = await MentHasFunc.update_mentor_info_description(uuid, achievements, background, field, intro);
    return res.status(200).send(mentor_uuid);
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
