import "./env";
import Debug from "debug";
import http from "http";
import app from "./app";
import { GraphQLClient } from "graphql-request";
import { queue_element } from "./helpers/docker_queue";
import { llm_cron } from "./helpers/llm_cron";
// import docker_cron from "./helpers/docker_queue";

const debug = Debug("eesast-api");

const normalizePort: (val: string) => number | boolean = (val) => {
  const portNo = parseInt(val, 10);
  if (portNo >= 0) {
    return portNo;
  }
  return false;
};

export const client = new GraphQLClient(
  `${process.env.HASURA_GRAPHQL_ENDPOINT}/v1/graphql`,
  {
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
    },
  },
);

export const docker_queue: queue_element[] = [];
// export const docker_queue: queue_element[] = JSON.parse(
//   fs.readFileSync("/data/queue_data.json").toString()
// );
// docker_cron();

// weekly_cron();
// weekly_init();

llm_cron();

const port = normalizePort(process.env.PORT || "28888");
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
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr!.port;
  debug("Listening on " + bind);
});

server.addListener("close", () => {
  try {
    //fs.writeFileSync('./queue_data.json', docker_queue.toString());
    console.log("stop!");
  } catch (err) {
    console.log(err);
  }
});
