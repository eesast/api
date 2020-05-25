import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";

export interface JwtPayload {
  email: string;
  role: string;
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": string[];
    "x-hasura-default-role": string;
    "x-hasura-user-id": string;
  };
}

/**
 * Middleware: validate user authorizations; reject if necessary
 */
const authenticate: (
  acceptableRoles?: string[]
) => (req: Request, res: Response, next: NextFunction) => Response | void = (
  acceptableRoles
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      const payload = decoded as JwtPayload;

      User.findOne({ email: payload.email }, (error, user) => {
        if (error) {
          console.error(err);
          return res.status(500).end();
        }
        if (!user) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
        req.auth = { user };
        // use authenticate() to accept all registered users
        if (!acceptableRoles || acceptableRoles.length === 0) {
          return next();
        }
        if (!acceptableRoles.includes(user.role)) {
          // leave it to next() to see if it indeed accesses `self`
          if (acceptableRoles.includes("self")) {
            req.auth.selfCheckRequired = true;
            return next();
          }

          return res.status(401).send("401 Unauthorized: Permission denied");
        }

        next();
      });
    });
  };
};

export default authenticate;
