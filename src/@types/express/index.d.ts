declare namespace Express {
  import { UserModel } from "../../models/user";

  interface Auth extends Partial<UserModel> {
    id?: number;
    role?: string;
    tokenValid?: boolean;
    selfCheckRequired?: boolean;
  }

  export interface Request {
    auth: Auth;
    params: {
      id?: number;
      category?: string;
    };
    filename?: string;
  }
}
