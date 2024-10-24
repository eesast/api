import express from "express";
import authenticate from "../middlewares/authenticate";
import * as noticeFunc from "../hasura/notice";
const router = express.Router();
//TODO: Optional parameters should be implemented.
router.post("/add", authenticate(["counselor","root"]), async (req, res) => {
  try {
    const title: string = req.body.title;
    const content: string = req.body.content;
    const files: string = req.body.files;
    const notice_type: string = req.body.notice_type;
    if (!title || !content || !files || !notice_type) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const notice_id = await noticeFunc.add_notice(title, content, files, notice_type);
    return res.status(200).send(notice_id);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/update", authenticate(["counselor","root"]), async (req, res) => {
  try {
    const id: string = req.body.id;
    const title: string = req.body.title;
    const content: string = req.body.content;
    const files: string = req.body.files;
    const notice_type: string = req.body.notice_type;
    if (!id || !title || !content || !files || !notice_type) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }
    const notice_id = await noticeFunc.update_notice(id, title, content, files, notice_type);
    return res.status(200).send(notice_id);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

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