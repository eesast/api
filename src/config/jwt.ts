/**
 * JWT payload definition
 */

export interface IJWTPayload {
  id: number;
  username: string;
  name: string;
  email: string;
  group: string;
  role: string;
}

export interface IAuthRequest extends Partial<IJWTPayload> {
  selfCheckRequired?: boolean;
  tokenValid?: boolean;
}

declare global {
  namespace Express {
    // tslint:disable-next-line: interface-name
    interface Request {
      auth: IAuthRequest;
      filename: string;
      params: any;
    }
  }
}
