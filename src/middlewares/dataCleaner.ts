import { NextFunction, Request, Response } from "express";

/**
 * Middleware: validate user authorizations; reject if necessary
 */
const cleaner = (datakey: string[] | undefined) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.body) {
    return res.status(400).end("No data received");
  }
  if (!datakey) {
    req.body = {};
    return next();
  }
  const rest: { [propName: string]: any } = {};
  for (const str of datakey) {
    if (req.body[str]) rest[str] = req.body[str];
  }
  req.body = rest;
  return next();
};

export default cleaner;
