import express from "express";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

router.get("/*", async (req, res) => {
  const path = req.url;

  const isPublic = path.split("/")[1] && path.split("/")[1] === "public";
  if (!isPublic) {
    /**
     * customize authorization
     * one possible solution for future scenarios:
     *   path based authorization:
     *     /public, /root/images, /[id]-filename.txt
     * now allow any tsinghua email verified user to access "/"
     */
    await new Promise((resolve) =>
      authenticate(["student", "teacher", "counselor", "root"])(
        req,
        res,
        resolve
      )
    );
  }

  // res.location(process.env.CDN_URL + sign);
  res.status(200).end();
});

export default router;
