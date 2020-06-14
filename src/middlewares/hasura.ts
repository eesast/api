import { NextFunction, Request, Response } from "express";

const hasura: (
  acceptableRoles?: string[]
) => (req: Request, res: Response, next: NextFunction) => Response | void = (
  acceptableRoles
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      req.headers["x-hasura-action-secret"] &&
      req.headers["x-hasura-action-secret"] ===
        process.env.HASURA_GRAPHQL_ACTION_SECRET
    ) {
      // use hasura() to accept all roles
      if (!acceptableRoles || acceptableRoles.length === 0) {
        return next();
      }

      if (
        req.body.session_variables["x-hasura-role"] &&
        acceptableRoles.includes(req.body.session_variables["x-hasura-role"])
      ) {
        return next();
      }

      return res.status(401).send("401 Unauthorized: Permission denied");
    } else {
      return res.status(401).send("401 Unauthorized: Permission denied");
    }
  };
};

export default hasura;
