import Debug from "debug";
import http from "http";
import mongoose from "mongoose";
import app from "./app";
import serverConfig from "./config/server";

const debug = Debug("sast-app-api");
const databaseUrl = process.env.DATABASE || "localhost";

const normalizePort = val => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

const onError = error => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  switch (error.code) {
    case "EACCES":
      debug(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      debug(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
};

mongoose.connect(
  `mongodb://${databaseUrl}:27017/sast-app-api`,
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  }
);
const db = mongoose.connection;
db.on("error", () => debug("Database connection error"));
db.once("open", () => {
  debug("Database connected");
});

const port = normalizePort(process.env.PORT || serverConfig.port);
app.set("port", port);

const server = http.createServer(app);
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);
