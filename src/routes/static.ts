import express from "express";
import md5 from "md5";
import cryptoRandomString from "crypto-random-string";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

const generateSign = (path: string) => {
  const rand = cryptoRandomString({ length: 32 });
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = md5(`${path}-${timestamp}-${rand}-0-${process.env.CDN_KEY}`);

  const sign = `${timestamp}-${rand}-0-${hash}`;

  const url = `${path}?sign=${sign}`;
  return url;
};

router.get("/*", async (req, res) => {
  const path = req.url;

  const isPublic = path.split("/")[1] && path.split("/")[1] === "public";
  if (!isPublic) {
    // customize authorization
    await new Promise((resolve) =>
      authenticate(["student", "teacher", "counselor", "root"])(
        req,
        res,
        resolve
      )
    );
  }

  const sign = generateSign(path);

  res.location(process.env.CDN_URL + sign);
  res.status(303).end();
});

export default router;
