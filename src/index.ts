import * as Debug from "debug";
import * as dotenv from "dotenv";
import * as http from "http";
import * as mongoose from "mongoose";
import app from "./app";
import serverConfig from "./config/server";

dotenv.config();
const debug = Debug("sast-app-api");
const databaseUrl =
  process.env.NODE_ENV === "production" ? process.env.DATABASE : "localhost";

const normalizePort: (val: string) => number | boolean = val => {
  const portNo = parseInt(val, 10);
  if (portNo >= 0) {
    return portNo;
  }
  return false;
};

mongoose.connect(`mongodb://${databaseUrl}:27017/sast-app-api`, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  auth: { authSource: "admin" },
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});

const db = mongoose.connection;

db.on("error", error => debug("Database connection error: " + error));
db.once("open", () => {
  debug("Database connected");
});

const port = normalizePort(process.env.PORT || serverConfig.port);
app.set("port", port);

const server = http.createServer(app);
server.listen(port);

server.on("error", (error: NodeJS.ErrnoException) => {
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
});

server.on("listening", () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
});
