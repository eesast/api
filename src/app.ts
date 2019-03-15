import * as cors from "cors";
import * as express from "express";
import * as helmet from "helmet";
import * as logger from "morgan";
import * as path from "path";
import serverConfig from "./config/server";
import articleRouter from "./routes/articles";
import commentRouter from "./routes/comments";
import itemRouter from "./routes/items";
import reservationRouter from "./routes/reservations";
import staticRouter from "./routes/static";
import userRouter from "./routes/users";

const app = express();

app.use(helmet());

// Enable header access in client
app.use(
  cors({
    exposedHeaders: "Location"
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/static", express.static(serverConfig.staticFilePath));
app.use("/docs", express.static(path.resolve(__dirname, "../docs")));
app.use("/static", staticRouter);
app.use("/v1/articles", articleRouter);
app.use("/v1/comments", commentRouter);
app.use("/v1/users", userRouter);
app.use("/v1/items", itemRouter);
app.use("/v1/reservations", reservationRouter);

export default app;
