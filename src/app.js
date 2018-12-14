import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import helmet from "helmet";
import cors from "cors";
import staticRouter from "./routes/static";
import articleRouter from "./routes/articles";
import commentRouter from "./routes/comments";
import userRouter from "./routes/users";
import serverConfig from "./config/server";

const app = express();

app.use(helmet());
app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
  "/static",
  express.static(path.resolve(__dirname, serverConfig.staticFilePath))
);
app.use("/static", staticRouter);
app.use("/v1/articles", articleRouter);
app.use("/v1/comments", commentRouter);
app.use("/v1/users", userRouter);

export default app;
