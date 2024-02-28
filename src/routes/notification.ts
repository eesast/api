import express from "express";
import { setVapidDetails, sendNotification } from 'web-push';
import authenticate from "../middlewares/authenticate";
import crypto from 'crypto';

const VAPID_PUBLIC_KEY = "BKSRw848EimTGFlZVpumm4jA2yhV25g8PjxRY_pEF8dJN4wqsbC5yQGSllhI63H_cDhRMDMtaRy57iLYc3MJoEY";
const VAPID_PRIVATE_KEY = "Tc1uIS8IO9TTvBJnrLj8y48TAyIoqdz1TSPCqSJY4BM";

interface Notification {
  title: string;
  options: {
    body?: string;
    icon?: string;
    data?: any;
    timestamp?: number;
    vibrate?: number[];
    tag?: string;
    image?: string;
    badge?: string;
    actions?: { action: string; title: string; icon?: string }[];
  };
}

const router = express.Router();

const subscriptions: any = {};

setVapidDetails(
  "https://eesast.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const hash = (input: string) => {
  const md5sum = crypto.createHash("md5");
  md5sum.update(Buffer.from(input));
  return md5sum.digest("hex");
}

router.post("/subscribe", authenticate(), (req, res) => {
  const index = hash(req.body.endpoint);
  subscriptions[index] = req.body;
  return res.status(200).json({ index: index });
});

router.post("/unsubscribe", authenticate(), (req, res) => {
  const index = req.body.index;
  delete subscriptions[index];
  return res.status(200).json({ message: "Unsubscribed" });
});

router.post("/broadcast", (req, res) => {
  for (const index in subscriptions) {
    console.log(index);
    const subscription = subscriptions[index];
    try {
      sendNotification(subscription, JSON.stringify(req.body as Notification));
    } catch (e) {
      console.error(e);
    }
  };
  return res.status(200).json({ message: "Sent" });
});

export default router;
