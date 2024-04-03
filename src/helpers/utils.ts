import getSTS from "../helpers/sts";
import COS from "cos-nodejs-sdk-v5";
import fStream from 'fs';


export const get_base_directory = async () => {
    return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!;
}

type ContestImages = {
  [key: string]: {
    RUNNER_IMAGE: string;
    COMPILER_IMAGE: string;
    COMPILER_TIMEOUT: string;
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    RUNNER_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp",
    COMPILER_TIMEOUT: "10m"
  },
  "THUAI7": {
    RUNNER_IMAGE: "eesast/thuai7_run",
    COMPILER_IMAGE: "eesast/thuai7_cpp",
    COMPILER_TIMEOUT: "10m"
  }
}


export interface TeamLabelBind {
  team_id: string;
  label: string;
}

export interface ContestResult {
  team_id: string;
  score: number;
};


export async function initCOS() {
  const sts = await getSTS([
    "name/cos:GetObject",
    "name/cos:DeleteObject",
    "name/cos:HeadObject",
    "name/cos:PutObject",
  ], "*");

  const cos = new COS({
    getAuthorization: async (options, callback) => {
      try {
        if (!sts) throw (Error("Credentials invalid!"));
        callback({
          TmpSecretId: sts.credentials.tmpSecretId,
          TmpSecretKey: sts.credentials.tmpSecretKey,
          SecurityToken: sts.credentials.sessionToken,
          StartTime: sts.startTime,
          ExpiredTime: sts.expiredTime,
        });
      } catch (err) {
        console.log(err);
      }
    }
  });

  return cos;
}

export async function getConfig() {
  const config = {
    bucket: process.env.COS_BUCKET!,
    region: 'ap-beijing',
  };
  return config;
}


export async function downloadObject(key: string, outputPath: string, cos: COS, config: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    cos.headObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
    }, (err, data) => {
        if (data) {
          cos.getObject({
            Bucket: config.bucket,
            Region: config.region,
            Key: key,
            Output: fStream.createWriteStream(outputPath),
          }, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        } else {
          reject(`key: ${key} Not found.`);
        }
      });
    });
  };
