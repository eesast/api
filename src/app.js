import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import helmet from "helmet";
import staticRouter from "./routes/static";
import articleRouter from "./routes/articles";

const app = express();

app.use(helmet());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/static", express.static(path.join(__dirname, "../public")));
app.use("/static", staticRouter);
app.use("/v1/articles", articleRouter);

export default app;
