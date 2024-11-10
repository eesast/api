import express from "express";
import * as ChatFunc from "../hasura/message";
import authenticate from "../middlewares/authenticate";

const router = express.Router();
//content should be like {"text":"hello"}
router.post("/send", authenticate(), async (req, res) => {
    try {
        const sender_id = req.auth.user.uuid;
        const receiver_id = req.body.receiver_id;
        const content = req.body.content;
        if (!receiver_id || !content) {
            return res.status(400).send("400 Bad Request: Missing receiver_id or content");
        }
        //TODO: check if receiver_id exists
        const chat = await ChatFunc.add_message(sender_id,receiver_id, content);
        return res.status(200).send(chat);
    } catch (err) {
        return res.status(500).send("500: Internal Server Error");
    }
});

export default router;
