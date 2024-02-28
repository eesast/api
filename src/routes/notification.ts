import express from "express";
import { setVapidDetails, PushSubscription, sendNotification } from 'web-push';
import authenticate from "../middlewares/authenticate";

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

const subscriptions: PushSubscription[] = [];

setVapidDetails(
  "https://eesast.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

router.post("/subscribe", authenticate(), (req, res) => {
  subscriptions.push(req.body);
  res.status(200).json({ message: "Subscribed" });
});

router.post("/unsubscribe", (req, res) => {
  const subscriptionIndex = subscriptions.findIndex(
    (subscription) => subscription.endpoint === req.body.endpoint
  );
  if (subscriptionIndex !== -1) {
    subscriptions.splice(subscriptionIndex, 1);
  }
  res.status(200).json({ message: "Unsubscribed" });
});

router.post("/notify", (req, res) => {
  subscriptions.forEach((subscription) => {
    try {
      sendNotification(subscription, JSON.stringify(req.body as Notification));
    } catch (error) {
      console.error(error);
    }
  });
  res.status(200).json({ message: "Notified" });
});
