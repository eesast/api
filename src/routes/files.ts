import express from "express";
import upload from "../models/file";
const router = express.Router();
router.post('/upload', async(req, res)=> {
    await upload(req, res);
    const file = req.file;
    console.log(file);
    if (file) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false });
    }

  });

export default router;
