import path from "path";

// test eesast docs locally
const docPath = path.resolve(__dirname, "../../assets/docs");

export default {
  docPath: process.env.NODE_ENV === "production" ? "/home/node/docs" : docPath,
};
