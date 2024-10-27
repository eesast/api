import express from "express";
import authenticate from "../middlewares/authenticate";
import * as noticeFunc from "../hasura/notice";
const router = express.Router();
//TODO: Optional parameters should be implemented.
router.post("/update", authenticate(["counselor","root"]), async (req, res) => {
  try {
    const title: string = req.body.title;
    const content: string = req.body.content;
    const files: string = req.body.files;
    const notice_type: string = req.body.notice_type;
    const notice_id = req.body.id;
    const updateFields : any = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;
    if (files) updateFields.files = files;
    if (notice_type) updateFields.notice_type = notice_type;
    console.log(updateFields);
    if(!notice_id || updateFields.length === 0)
    {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const notice_uuid: string = await noticeFunc.update_notice(notice_id,updateFields);
    return res.status(200).send(notice_uuid);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

//router.post("/update", authenticate(["counselor","root"]), async (req, res) => {
//  try {
//    const id: string = req.body.id;
//    const title: string = req.body.title;
//    const content: string = req.body.content;
//    const files: string = req.body.files;
//    const notice_type: string = req.body.notice_type;
//    if (!id || !title || !content || !files || !notice_type) {
//      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
//    }
//    const notice_id = await noticeFunc.update_notice(id, title, content, files, notice_type);
//    return res.status(200).send(notice_id);
//  } catch (err) {
//    return res.status(500).send("Internal Server Error");
//  }
//});

router.post("/delete", authenticate(["counselor","root"]), async (req, res) => {
  try {
    const id: string = req.body.id;
    if (!id) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const notice_id = await noticeFunc.delete_notice(id);
    return res.status(200).send(notice_id);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

export default router;