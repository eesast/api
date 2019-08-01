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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface Request {
      auth: IAuthRequest;
      filename: string;
      params: any;
    }
  }
}
