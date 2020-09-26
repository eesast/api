import OSS, { STS } from "ali-oss";

let expirationTime: Date | null = null;
let oss: OSS | null = null;

export const policy = {
  Version: "1",
  Statement: [
    {
      Action: "oss:*",
      Resource: "*",
      Effect: "Allow",
    },
  ],
};

export const getOSS = async () => {
  if (
    oss === null ||
    expirationTime === null ||
    expirationTime.getTime() <= new Date().getTime()
  ) {
    const client = new STS({
      accessKeyId: process.env.OSS_KEY_ID!,
      accessKeySecret: process.env.OSS_KEY_SECRET!,
    });

    const auth = await new Promise<any>((resolve, reject) =>
      client
        .assumeRole(process.env.OSS_ROLE_ARN, policy, 3600)
        .then((result: any) => {
          resolve(result.credentials);
        })
        .catch((err: Error) => {
          console.error(err);
          reject(err);
        })
    );

    expirationTime = new Date(auth.Expiration);

    oss = new OSS({
      region: "oss-cn-beijing",
      accessKeyId: auth.AccessKeyId,
      accessKeySecret: auth.AccessKeySecret,
      stsToken: auth.SecurityToken,
      bucket: "eesast",
      cname: true,
      endpoint: process.env.OSS_URL,
      secure: true,
    });
    return oss;
  } else {
    return oss;
  }
};
