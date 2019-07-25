import * as cors from "cors";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import serverConfig from "./config/server";
import articleRouter from "./routes/articles";
import commentRouter from "./routes/comments";
import itemRouter from "./routes/items";
import reservationRouter from "./routes/reservations";
import staticRouter from "./routes/static";
import teamRouter from "./routes/teams";
import userRouter from "./routes/users";
import timelineRouter from "./routes/timeline";
const app = express();

// Enable header access in client
app.use(
  cors({
    exposedHeaders: "Location"
  })
);

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));

app.use("/static", express.static(serverConfig.staticFilePath));
app.use("/static", staticRouter);
app.use("/v1", express.static(path.resolve(__dirname, "../docs")));
app.use("/v1/articles", articleRouter);
app.use("/v1/comments", commentRouter);
app.use("/v1/users", userRouter);
app.use("/v1/items", itemRouter);
app.use("/v1/reservations", reservationRouter);
app.use("/v1/teams", teamRouter);
app.use("/v1/timeline", timelineRouter);

export default app;
