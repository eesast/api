import express from "express";
import { PushSubscription, sendNotification } from 'web-push';
import authenticate from "../middlewares/authenticate";
import crypto from 'crypto';

const router = express.Router();

const VAPID_PUBLIC_KEY = "BKSRw848EimTGFlZVpumm4jA2yhV25g8PjxRY_pEF8dJN4wqsbC5yQGSllhI63H_cDhRMDMtaRy57iLYc3MJoEY";
const VAPID_PRIVATE_KEY = "Tc1uIS8IO9TTvBJnrLj8y48TAyIoqdz1TSPCqSJY4BM";

export interface Notification {
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

const subscriptions: any = {};

const hash = (input: string) => {
  const md5sum = crypto.createHash("md5");
  md5sum.update(Buffer.from(input));
  return md5sum.digest("hex");
}

export const send = async (subscription: PushSubscription, notification: Notification) => {
  const message = JSON.stringify(notification);
  const options = {
    timeout: 3000,
    vapidDetails: {
      subject: "https://eesast.com",
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY
    },
  };
  try {
    const response = await sendNotification(subscription, message, options);
    if (response.statusCode !== 201) throw new Error("Unexpected status code: " + response.statusCode);
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
};

router.post("/subscribe", authenticate(), async (req, res) => {
  const index = hash(req.body.endpoint);
  subscriptions[index] = req.body;
  const notification = {
    title: "感谢订阅",
    options: { body: "您将在此看到来自EESAST的最新消息" }
  };
  const response = await send(req.body, notification);
  if (!response) {
    delete subscriptions[index];
    return res.status(504).json({ message: "Failed to send notification" });
  }
  return res.status(200).json({ index: index });
});

router.post("/check", authenticate(), (req, res) => {
  const index = hash(req.body.endpoint);
  return res.status(200).json({ subscribed: !!subscriptions[index] });
});

router.post("/unsubscribe", authenticate(), (req, res) => {
  const index = req.body.index;
  if (!subscriptions[index]) return res.status(200).json({ message: "Not found" });
  delete subscriptions[index];
  return res.status(200).json({ message: "Unsubscribed" });
});

router.post("/broadcast", async (req, res) => {
  for (const index in subscriptions) {
    const subscription = subscriptions[index];
    const response = await send(subscription, req.body);
    if (response) {
      console.log("Notification sent to", index);
    } else {
      console.error("Failed to send notification to", index);
    }
  };
  return res.status(200).json({ message: "Sent" });
});

export default router;
