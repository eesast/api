import express from "express";
import multer from "multer";
import uuid from "uuid/v1";
import path from "path";
import fs from "fs";
import mkdirp from "mkdirp";
import serverConfig from "../config/server";
import authenticate from "../middlewares/authenticate";

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(
      __dirname,
      serverConfig.staticFilePath,
      req.params.category
    );
    mkdirp(dir, err => cb(err, dir));
  },
  filename: (req, file, cb) => {
    const dotIndex = file.originalname.lastIndexOf(".");
    const extention = file.originalname.substring(dotIndex);
    const newFilename = uuid() + extention;
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
router.post(
  "/:category",
  authenticate(["root", "writer"]),
  upload.single("file"),
  (req, res) => {
    const category = req.params.category;
    res.setHeader("Location", `/static/${category}/` + req.filename);
    res.status(201).send(`/static/${category}/` + req.filename);
  }
);

/**
 * DELETE
 * @param {String} category directory
 * @param {String} filename
 * @returns {String} No Content (success) or Not Found
 */
router.delete(
  "/:category/:filename",
  authenticate(["root", "writer"]),
  upload.single("file"),
  (req, res) => {
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
  }
);

export default router;
