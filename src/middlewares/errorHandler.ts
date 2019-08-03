import { Request, Response, NextFunction } from "express";

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errors = err.errors || [{ message: err.message }];
  res.status(err.status || 500).json({ errors });
}
