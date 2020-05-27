import express from "express";
import md5 from "md5";
import cryptoRandomString from "crypto-random-string";
import STS from "qcloud-cos-sts";
import authenticate from "../middlewares/authenticate";

const router = express.Router();

const allowPrefix = "upload";

const getPolicy = () => ({
  version: "2.0",
  statement: [
    {
      action: ["name/cos:PutObject", "name/cos:PostObject"],
      effect: "allow",
      resource: [
        `qcs::cos:${process.env.COS_REGION}:uid/${process.env.COS_APPID}:${process.env.COS_BUCKET}-${process.env.COS_APPID}/${allowPrefix}/*`,
      ],
    },
  ],
});

router.get("/sts", authenticate(["counselor", "root"]), async (req, res) => {
  STS.getCredential(
    {
      secretId: process.env.COS_SECRETID,
      secretKey: process.env.COS_SECRETKEY,
      region: process.env.COS_REGION,
      policy: getPolicy(),
    },
    (err: any, tempKeys: any) => {
      if (err) {
        console.error(err);
        return res.status(500).end();
      }

      const startTime = Math.floor(Date.now() / 1000);
      if (tempKeys) tempKeys.startTime = startTime;
      return res.status(200).send(tempKeys);
    }
  );
});

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

  const sign = generateSign(path);

  res.location(process.env.CDN_URL + sign);
  res.status(303).end();
});

export default router;
