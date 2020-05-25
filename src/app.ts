import cors from "cors";
import express from "express";
import logger from "morgan";
import staticRouter from "./routes/static";
import userRouter from "./routes/users";

const app = express();

if (process.env.NODE_ENV === "production") {
  const whitelist = ["https://eesast.com", "http://localhost:3000"];

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
}

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/static", staticRouter);
app.use("/users", userRouter);

export default app;
