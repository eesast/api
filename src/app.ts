import cors from "cors";
import express from "express";
import logger from "morgan";
import staticRouter from "./routes/static";
import userRouter from "./routes/users";
import emailRouter from "./routes/emails";
import codeRouter from "./routes/code";
// import roomRouter from "./routes/room";
// import contestRouter from "./routes/contest";

const app = express();

const whitelist =
  process.env.NODE_ENV === "production"
    ? ["https://eesast.com", "http://localhost:3000"]
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
  })
);

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", staticRouter);
app.use("/users", userRouter);
app.use("/emails", emailRouter);
app.use("/code", codeRouter);
// app.use("/room", roomRouter);
// app.use("/contest", contestRouter);

export default app;
