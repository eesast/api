import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { IJWTPayload } from "../config/jwt";
import secret from "../config/secret";

/**
 * Middleware: Only check token status; do not reject
 */
const checkToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.auth = {
      tokenValid: false
    };
    return next();
  }

  const token = authHeader.substring(7);
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      req.auth = {
        tokenValid: false
      };
      return next();
    }

    const userInfo = decoded as IJWTPayload;
    req.auth = {
      tokenValid: true,
      id: userInfo.id,
      group: userInfo.group,
      role: userInfo.role
    };
    next();
  });
};

export default checkToken;
