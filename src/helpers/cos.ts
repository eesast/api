import STS from "qcloud-cos-sts";
import COS from "cos-nodejs-sdk-v5";
import fStream from 'fs';

// 获取临时密钥
export const getSTS: any = async (action: string[], prefix: string) => {
    // 配置参数
    const config = {
        secretId: process.env.GROUP_SECRET_ID!,   // 固定密钥
        secretKey: process.env.GROUP_SECRET_KEY!,  // 固定密钥
        proxy: '',
        host: 'sts.tencentcloudapi.com',
        durationSeconds: 1800,  // 密钥有效期
        bucket: process.env.COS_BUCKET!, // 换成你的 bucket
        region: 'ap-beijing', // 换成 bucket 所在地区
    };
    const scope = [{
        action: action,
        bucket: config.bucket,
        region: config.region,
        prefix: prefix,
    }];
    const policy = STS.getPolicy(scope);
    return new Promise((resolve, reject) => STS.getCredential({
        secretId: config.secretId,
        secretKey: config.secretKey,
        proxy: config.proxy,
        policy: policy,
        durationSeconds: config.durationSeconds,
    }, (err, credential) => {
        if (err) reject(err);
        else resolve(credential);
    }))
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
          if (data) {
            console.debug('Upload Success');
          }
          // console.debug('Upload Success', data);
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

  export const listFile = (prefix: string, cos: COS, config: any): Promise<COS.CosObject[]> => {
    return new Promise<COS.CosObject[]>((resolve, reject) => {
      cos.getBucket(
        {
          Bucket: config.bucket,
          Region: config.region,
          Prefix: prefix,
        },
        (err, data) => {
          if (err || !data) return reject(err);
          return resolve(data.Contents);
        },
      );
    });
  };


  export const getAvatarUrl = (key: string, cos: COS, config: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: key,
        },
        (err, data) => {
          if (err) return reject(err);
          resolve(data.Url);
        },
      );
    });
  };
