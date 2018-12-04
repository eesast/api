import express from "express";
import multer from "multer";
import uuid from "uuid/v1";
import path from "path";
import fs from "fs";
import serverConfig from "../config/server";

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(
      null,
      path.join(__dirname, serverConfig.staticFilePath, req.params.category)
    );
  },
  filename: (req, file, cb) => {
    const dotIndex = file.originalname.lastIndexOf(".");
    const extention = file.originalname.substring(dotIndex);
    const filename = file.originalname.substring(0, dotIndex);
    const newFilename = filename + "_" + uuid() + extention;
    req.filename = newFilename;
    cb(null, newFilename);
  }
});
const upload = multer({ storage: storage });

/**
 * GET
 * get static files
 * use express.static in `app.js`
 */

/**
 * POST
 * @param {String} category directory
 * @returns {String} Location header
 */
router.post("/:category", upload.single("file"), (req, res) => {
  const category = req.params.category;
  res.setHeader("Location", `/static/${category}/` + req.filename);
  res.status(201).end();
});

/**
 * DELETE
 * @param {String} category directory
 * @param {String} filename
 * @returns {String} No Content (success) or Not Found
 */
router.delete("/:category/:filename", upload.single("file"), (req, res) => {
  const category = req.params.category;
  const filename = req.params.filename;
  const fullPath = path.join(
    __dirname,
    serverConfig.staticFilePath,
    category,
    filename
  );

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send("404 Not Found: File does not exist");
  }
  fs.unlink(fullPath, err => {
    if (err) {
      res.status(500).end();
    } else {
      res.status(204).end();
    }
  });
});

export default router;
