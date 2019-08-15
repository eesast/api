import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import secret from "../configs/secret";
import User, { UserModel } from "../models/user";

/**
 * Middleware: validate user authorizations; reject if necessary
 */
const authenticate: (
  acceptableRoles: string[] | undefined
) => (
  req: Request,
  res: Response,
  next: NextFunction
) => Response | void = acceptableRoles => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, secret, (err, decoded) => {
      const userInfo = decoded as UserModel;

      if (err) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      req.auth = { tokenValid: true, ...userInfo };

      // use authenticate() to accept all registered users
      if (!acceptableRoles || acceptableRoles.length === 0) {
        return next();
      }

      const query = {
        id: userInfo.id,
        username: userInfo.username,
        name: userInfo.name,
        email: userInfo.email
      };

      User.findOne(query, (error, user) => {
        if (error) {
          return res.status(500).end();
        }
        if (!user) {
          return res.status(401).send("401 Unauthorized: Permission denied");
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
