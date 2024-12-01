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
export interface IRegister {
  role: string;
  verificationEmailCode?: string;
  verificationEmailToken?: string;
  verificationPhoneCode?: string;
  verificationPhoneToken?: string;
  studentID?: string;
  name: string;
  class_?: string;
  depart?: string;
  password: string;
  username?: string;
}
export interface UserInfo {
  uuid: string;
  role: string;
  username: string;
  password: string;
  realname: string;
  email: string;
  phone: string;
  student_no: string;
  department: string;
  class: string;
  tsinghua_email: string;
  github_id: string;
}
const anonymous_user: UserInfo = {
  uuid: "00000000-0000-0000-0000-000000000000",
  role: "anonymous",
  username: "",
  password: "",
  realname: "Anonymous",
  email: "",
  phone: "",
  student_no: "",
  department: "",
  class: "",
  tsinghua_email: "",
  github_id: "",
};

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
      if (!acceptableRoles || acceptableRoles.length === 0 || acceptableRoles.includes("anonymous")) {
        req.auth = { user: anonymous_user };
        return next();
      }
      else {
        return res.status(401).send("401 Unauthorized: Missing Token");
      }
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
        const users: any = await client.request(
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
        )
        const user = users.users[0];
        req.auth = { user: user ?? anonymous_user };
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
