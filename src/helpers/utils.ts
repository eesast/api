import getSTS from "../helpers/sts";
import COS from "cos-nodejs-sdk-v5";
import fStream from 'fs';
import Docker from "dockerode";
import { join } from "path";
import * as fs from "fs/promises";


export const get_base_directory = async () => {
    return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!; // BASE_DIR is /var/contest, for example
}

type ContestImages = {
  [key: string]: {
    COMPILER_IMAGE: string;
    COMPILER_TIMEOUT: string;
    RUNNER_IMAGE?: string;
    SERVER_IMAGE?: string;
    CLIENT_IMAGE?: string;
    ENVOY_IMAGE?: string;
    RUNNER_TIMEOUT: string;
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    RUNNER_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp",
    COMPILER_TIMEOUT: "10m",
    RUNNER_TIMEOUT: "30m",
  },
  "THUAI7": {
    COMPILER_IMAGE: "eesast/thuai7_cpp",
    COMPILER_TIMEOUT: "10m",
    SERVER_IMAGE: "eesast/thuai7_server",
    CLIENT_IMAGE: "eesast/thuai7_client",
    ENVOY_IMAGE: "envoyproxy/envoy:latest",
    RUNNER_TIMEOUT: "30m"
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
    "name/cos:GetBucket"
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


export async function uploadObject(localFilePath: string, bucketKey: string, cos: COS, config: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const fileStream = fStream.createReadStream(localFilePath);
    fileStream.on('error', (err) => {
      console.log('File Stream Error', err);
      reject('Failed to read local file');
    });
    cos.putObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: bucketKey,
      Body: fileStream,
    }, (err, data) => {
      if (err) {
        console.log(err);
        reject('Failed to upload object to COS');
      } else {
        console.debug('Upload Success', data);
        resolve(true);
      }
    });
  });
};


export async function deleteObject(key: string, cos: COS, config: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    cos.deleteObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
    }, (err, data) => {
      if (err) {
        console.log(err);
        reject('Failed to delete object from COS');
      } else {
        console.debug('Delete Success', data);
        resolve(true);
      }
    });
  });
}

export async function deleteFolder(folderPrefix: string, cos: COS, config: any): Promise<boolean> {
  try {
    const listParams = {
      Bucket: config.bucket,
      Region: config.region,
      Prefix: folderPrefix,
    };
    const data = await cos.getBucket(listParams);
    const objects = data.Contents || [];

    const deletePromises = objects.map(obj =>
      deleteObject(obj.Key, cos, config)
    );
    await Promise.all(deletePromises);

    return true;
  } catch (err) {
    console.error("Failed to delete folder from COS:", err);
    return false;
  }
}


export async function initDocker() {
  const docker =
    process.env.DOCKER === "remote"
      ? new Docker({
        host: process.env.DOCKER_URL!,
        port: process.env.DOCKER_PORT!,
      })
      : new Docker();
  return docker;
}


export async function deleteAllFilesInDir(directoryPath: string) {
  const files = await fs.readdir(directoryPath);
  await Promise.all(files.map(async (file) => {
    const filePath = join(directoryPath, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await deleteAllFilesInDir(filePath);
    } else {
      await fs.unlink(filePath);
    }
  }
  ));
  await fs.rmdir(directoryPath);
}

export async function checkPathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    return false;
  }
}
