export default {
  port: "28888",
  keyPath: "",
  certPath: "",
  staticFilePath:
    process.env.NODE_ENV === "production" ? "/home/node/public" : "../../public"
};
