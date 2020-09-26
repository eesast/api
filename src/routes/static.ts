import express from "express";
import authenticate from "../middlewares/authenticate";
import { STS } from "ali-oss";
import { policy, getOSS } from "../helpers/oss";

const router = express.Router();

router.get("/sts", authenticate(["counselor", "root"]), async (req, res) => {
  const client = new STS({
    accessKeyId: process.env.OSS_KEY_ID!,
    accessKeySecret: process.env.OSS_KEY_SECRET!,
  });

  client
    .assumeRole(process.env.OSS_ROLE_ARN, policy, 3600)
    .then((result: any) => {
      res.status(200).json({
        AccessKeyId: result.credentials.AccessKeyId,
        AccessKeySecret: result.credentials.AccessKeySecret,
        SecurityToken: result.credentials.SecurityToken,
        Expiration: result.credentials.Expiration,
      });
    })
    .catch((err: Error) => {
      console.error(err);
      res.status(500).end();
    });
});

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
      authenticate(["student", "teacher", "counselor", "root", "EEsenior"])(
        req,
        res,
        resolve
      )
    );
  }

  const oss = await getOSS();

  const filename = path.split("/").slice(-1)[0];
  const response = {
    "content-disposition": `attachment; filename=${filename}`,
  };

  const url = oss.signatureUrl(path.substr(1), { response }) as string;

  res.location(url.replace(process.env.OSS_URL!, process.env.STATIC_URL!));
  res.status(303).end();
});

export default router;
