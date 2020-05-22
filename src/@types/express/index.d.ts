import { UserModel } from "../../models/user";

declare module "express-serve-static-core" {
  interface Request {
    auth: {
      user: UserModel;
      selfCheckRequired?: boolean;
    };
  }
}
