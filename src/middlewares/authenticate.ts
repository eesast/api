import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";

export interface JwtUserPayload {
  uuid: string;
  role: string;
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": string[];
    "x-hasura-default-role": string;
    "x-hasura-user-id": string;
  };
}
export interface JwtVerifyPayload {
  email: string;
  phone: string;
  code: string; // hash加密后的验证码
}
export interface JwtCompilerPayload {
  code_id: string;
  team_id: string;
  contest_name: string;
  cos_path: string;
}
export interface UserInfo {
  uuid: string;
  username: string;
  password: string;
  role: string;
  realname: string;
  email: string;
  phone: string;
  student_no: string;
  department: string;
  class: string;
  tsinghua_email: string;
  github_id: string;
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
    if(!authHeader) {
      req.auth = { user: {
        uuid: "00000000-0000-0000-0000-000000000000",
        role: "anonymous",
        realname: "Anonymous",
        phone: "00000000000",
        student_no: "00000000000",
        department: "00000000000",
        class: "00000000000",
        tsinghua_email: "00000000000",
        github_id: "00000000000",
        username: "",
        password: "",
        email: "anonymous"
      } };
      return next();
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as JwtUserPayload;
      // console.log(payload.uuid); //delete
      try {
        const user = (await client.request(
          gql`
            query MyQuery($uuid: uuid!) {
              users(where: {uuid: {_eq: $uuid}}) {
                uuid,
                username,
                password,
                role,
                realname,
                email,
                phone,
                student_no,
                department,
                class,
                tsinghua_email,
                github_id,
              }
            }
          `,
          {
            uuid: payload.uuid
          }
        )).users[0];
        if (!user) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
        req.auth = { user };
        if (!acceptableRoles || acceptableRoles.length === 0 || acceptableRoles.includes(user.role)) {
          return next();
        }
        else {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      } catch (err) {
        console.error(err);
        return res.status(500).send(err);
      }
    });
  };
};

export default authenticate;
