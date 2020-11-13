import express from "express";
import serverConfig from "../configs/server";

const router = express.Router();

router.use("/", express.static(serverConfig.docPath));

export default router;
