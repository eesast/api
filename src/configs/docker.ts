/**
 * THUAI docker
 */

export default (process.env.NODE_ENV === "production"
  ? process.env.IMAGE_NAME
  : "test") as string;
