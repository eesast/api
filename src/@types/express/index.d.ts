import { UserInfo } from "../../middlewares/authenticate";

declare module "express-serve-static-core" {
    interface Request {
      auth: {
        user: UserInfo;
      };
    }
  }