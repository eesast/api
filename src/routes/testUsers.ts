
import * as express from "express";

const router = express.Router();

router.post("/", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        return res.status(422).send("422 Missing");
    }
    else {
        return res.status(201).send("201 Success");
    }
})

export default router;