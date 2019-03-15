import * as express from "express";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as multer from "multer";
import * as path from "path";
import { v1 as uuid } from "uuid";
import serverConfig from "../config/server";
import authenticate from "../middlewares/authenticate";

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(serverConfig.staticFilePath, req.params.category!);
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
const upload = multer({ storage });

/**
 * GET
 * Get static files
 * Use `express.static()` in `app.js`
 */

/**
 * POST new files
 * @param {string} category directory
 * @returns Location header
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
 * DELETE file
 * @param {string} category - local directory
 * @param {string} filename
 * @returns No Content or Not Found
 */
router.delete(
  "/:category/:filename",
  authenticate(["root", "writer"]),
  upload.single("file"),
  (req, res) => {
    const category = req.params.category;
    const filename = req.params.filename;
    const fullPath = path.join(serverConfig.staticFilePath, category, filename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("404 Not Found: File does not exist");
    }
    return fs.unlink(fullPath, err => {
      if (err) {
        res.status(500).end();
      } else {
        res.status(204).end();
      }
    });
  }
);

export default router;
