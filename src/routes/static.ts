import express from "express";
import authenticate from "../middlewares/authenticate";
import { STS } from "ali-oss";

const router = express.Router();

const policy = {
  Version: "1",
  Statement: [
    {
      Action: "oss:*",
      Resource: "*",
      Effect: "Allow",
    },
  ],
};

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

export default router;
