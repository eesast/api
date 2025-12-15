import cors from "cors";
import express from "express";
import logger from "morgan";
import staticRouter from "./routes/static";
import userRouter from "./routes/user";
import emailRouter from "./routes/emails";
import weeklyRouter from "./routes/weekly";
import docsRouter from "./routes/docs";
import applicationRouter from "./routes/application";
import fileRouter from "./routes/files";
import codeRouter from "./routes/code";
// import contestRouter from "./routes/contest";
// import roomRouter from "./routes/room";
import teamRouter from "./routes/team";
import manageRouter from "./routes/manage";
import arenaRouter from "./routes/arena";
import competitionRouter from "./routes/competition";
import notificationRouter from "./routes/notification";
import chatRoute from "./routes/chat";
import mentorRoute from "./routes/mentor";
import noticeRoute from "./routes/notice";
import courseRouter from "./routes/course";
import llmRouter from "./routes/llm";

const app = express();

const whitelist =
  process.env.NODE_ENV === "production"
    ? ["https://eesast.com", "https://docs.eesast.com", "http://localhost:3000"]
    : ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", staticRouter);
app.use("/user", userRouter);
app.use("/emails", emailRouter);
app.use("/weekly", weeklyRouter);
app.use("/llm", llmRouter);
app.use("/docs", docsRouter);
app.use("/application", applicationRouter);
app.use("/files", fileRouter);
app.use("/code", codeRouter);
// app.use("/contest", contestRouter);
// app.use("/room", roomRouter);
app.use("/team", teamRouter);
app.use("/manage", manageRouter);
app.use("/arena", arenaRouter);
app.use("/competition", competitionRouter);
app.use("/notification", notificationRouter);
app.use("/chat", chatRoute);
app.use("/mentor", mentorRoute);
app.use("/notice", noticeRoute);
app.use("/course", courseRouter);
export default app;
