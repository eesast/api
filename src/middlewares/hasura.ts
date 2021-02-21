import { NextFunction, Request, Response } from "express";

const hasura = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.headers["x-hasura-action-secret"] &&
    req.headers["x-hasura-action-secret"] === process.env.ACTION_SECRET
  ) {
    return next();
  } else {
    return res.status(401).send("401 Unauthorized: Permission denied");
  }
};

export default hasura;
