import express from "express";
import Application from "../models/application";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/info", async (req, res) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            return res.status(401).send("401 Unauthorized: Missing token");
        }
        const token = authHeader.substring(7);
        return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
            if (err || !decoded) {
                return res
                .status(401)
                .send("401 Unauthorized: Token expired or invalid");
            }
            const year = new Date().getFullYear();
            const info = await Application.findOne({ "activateIn": year });
            if (!info) {
                return res.status(500).send("Error!");
            }
            return res.status(200).send(info);
        })
    } catch (err) {
        return res.status(500).send(err);
    }
})

export default router;
