import cors from "cors";
import express from "express";
import logger from "morgan";
import staticRouter from "./routes/static";
import userRouter from "./routes/users";
import docRouter from "./routes/docs";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", staticRouter);
app.use("/users", userRouter);
app.use("/docs", docRouter);

export default app;
