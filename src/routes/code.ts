import express from "express";
import Docker from "dockerode";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";
import getSTS from "../helpers/sts";
import fStream from 'fs';
import COS from "cos-nodejs-sdk-v5";
import { join } from "path";

const router = express.Router();

const base_directory = process.env.NODE_ENV === "production" ? '/data/thuai6/' : '/home/alan/thuai6';

interface JwtCompilerPayload {
  team_id: string;
}

interface Url {
  key: string;
  path: string;
}

/**
 * POST compile code of team_id
 * @param token (user_id)
 * @param {uuid} req.body.team_id
 */
// query whether is manager, query whether is in team
router.post("/compile", async (req, res) => {
  try {
    const team_id = req.body.team_id;
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as JwtPayload;
      const user_id = payload._id;
      // console.log(user_id);
      const query_if_manager = await client.request(
        gql`
          query query_is_manager($contest_id: uuid, $user_id: String) {
            contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
              user_id
            }
          }
        `,
        { contest_id: process.env.GAME_ID, user_id: user_id }
      );
      // console.log(query_if_manager);
      const is_manager = query_if_manager.contest_manager.length != 0;
      // console.log(is_manager);
      if (!is_manager) {
        try {
          // console.log("@@1");
          const query_in_team = await client.request(
            gql`
              query query_if_in_team($team_id: uuid, $user_id: String, $contest_id: uuid) {
                contest_team(
                  where: {
                    _and: [
                      { contest_id: { _eq: $contest_id } }
                      { team_id: { _eq: $team_id } }
                      {
                        _or: [
                          { team_leader: { _eq: $user_id } }
                          { contest_team_members: { user_id: { _eq: $user_id } } }
                        ]
                      }
                    ]
                  }
                ) {
                  team_id
                }
              }
            `,
            { contest_id: process.env.GAME_ID, team_id: team_id, user_id: user_id }
          );
          // console.log("@@2");
          console.log(query_in_team);
          const is_in_team = query_in_team.contest_team.length != 0;
          if (!is_in_team) return res.status(401).send("当前用户不在队伍中");
          // console.log("@@3");
        } catch (err) {
          return res.status(400).send(err);
        }
      }
      try {
        // console.log("@@ try to create dir");
        try {
          await fs.mkdir(`${base_directory}/${team_id}`, {
            recursive: true,
            mode: 0o775,
          });
        } catch (err) {
          return res.status(400).send("文件存储目录创建失败");
        }

        try {
          const get_contest_codes = await client.request(
            gql`query get_team_codes($team_id: uuid){
              contest_code(where: {team_id: {_eq: $team_id}}) {
                code1
                code2
                code3
                code4
                code5
                code_type1
                code_type2
                code_type3
                code_type4
                code_type5
              }
            }`,
            { team_id: team_id }
          );
          //判断是否为cpp或python
          if ((get_contest_codes.contest_code[0].code_type1 != "cpp" && get_contest_codes.contest_code[0].code_type1 != "py") ||
            (get_contest_codes.contest_code[0].code_type2 != "cpp" && get_contest_codes.contest_code[0].code_type2 != "py") ||
            (get_contest_codes.contest_code[0].code_type3 != "cpp" && get_contest_codes.contest_code[0].code_type3 != "py") ||
            (get_contest_codes.contest_code[0].code_type4 != "cpp" && get_contest_codes.contest_code[0].code_type4 != "py") ||
            (get_contest_codes.contest_code[0].code_type5 != "cpp" && get_contest_codes.contest_code[0].code_type5 != "py") ||
            !get_contest_codes.contest_code[0].code1 ||
            !get_contest_codes.contest_code[0].code2 ||
            !get_contest_codes.contest_code[0].code3 ||
            !get_contest_codes.contest_code[0].code4 ||
            !get_contest_codes.contest_code[0].code5) {
              return res.status(400).send("未完成全部文件上传");
            }
          const sts = await getSTS([
            "name/cos:PutObject",
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload",
            "name/cos:AbortMultipartUpload",
            "name/cos:GetObject",
            "name/cos:DeleteObject",
            "name/cos:GetBucket"
          ], "*");

          const cos = new COS({
            getAuthorization: async (options: object, callback: (
              params: COS.GetAuthorizationCallbackParams
            ) => void) => {
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
                return console.log(err);
              }
            }
          });

          const config = {
            bucket: 'eesast-1255334966',
            region: 'ap-beijing',
          };



          const downloadObject = async function downloadObject(key: string, outputPath: string): Promise<boolean> {
            return new Promise((resolve, reject) => {
              // console.log(key)
              const key_prefix = key.match(/THUAI6\/.*\//i);
              if (key_prefix) {
                cos.getBucket({
                  Bucket: config.bucket,
                  Region: config.region,
                  Prefix: key_prefix[0],           /* Prefix表示列出的object的key以prefix开始，非必须 */
                  Delimiter: "/"
                }, function(err, data) {
                    if (err) {
                      reject(err);
                    } else {
                      // console.log(data.Contents.length);
                      let find_flag = false;
                      for (let i = 0;i < data.Contents.length && !find_flag;i++) {
                        // console.log("content: " + data.Contents[i].Key)
                        if (data.Contents[i].Key == key) {
                          // console.log('find key')
                          find_flag = true;
                        }
                      }
                      if (find_flag) {
                        cos.getObject({
                          Bucket: config.bucket,
                          Region: config.region,
                          Key: key,
                          Output: fStream.createWriteStream(outputPath),
                        }, (err) => {
                          if (err) {
                            reject(err);
                          } else {
                            // console.log(data);
                            resolve(true);
                          }
                        });
                          // resolve(true);
                      } else {
                        reject('not find key')
                      }

                    }
                });
              } else {
                reject('key prefix error')
              }
            });
          };

          const urls: Url[] = [];
          const codes = get_contest_codes.contest_code[0];
          urls.push({ key: `${codes.code1}`, path: `${base_directory}/${team_id}/player1.${codes.code_type1}` });
          urls.push({ key: `${codes.code2}`, path: `${base_directory}/${team_id}/player2.${codes.code_type2}` });
          urls.push({ key: `${codes.code3}`, path: `${base_directory}/${team_id}/player3.${codes.code_type3}` });
          urls.push({ key: `${codes.code4}`, path: `${base_directory}/${team_id}/player4.${codes.code_type4}` });
          urls.push({ key: `${codes.code5}`, path: `${base_directory}/${team_id}/player5.${codes.code_type5}` });
          const downloadAllFiles = async function downloadAllFiles() {
            // const urls = [
            //   { key: `/THUAI6/${team_id}/player1.cpp`, path: `${base_directory}/${team_id}/player1.cpp` },
            //   { key: `/THUAI6/${team_id}/player2.cpp`, path: `${base_directory}/${team_id}/player2.cpp` },
            //   { key: `/THUAI6/${team_id}/player3.cpp`, path: `${base_directory}/${team_id}/player3.cpp` },
            //   { key: `/THUAI6/${team_id}/player4.cpp`, path: `${base_directory}/${team_id}/player4.cpp` },
            // ];
            const promises = urls.map((url) => downloadObject(url.key, url.path));
            await Promise.all(promises);
          };

          // 删除文件, 写成Promise
          const deleteFile = async function deleteAllFilesInDir(directoryPath: string) {
            const files = await fs.readdir(directoryPath); // 获取目录下所有文件的名称
            await Promise.all(files.map(async (file) => {
              const filePath = join(directoryPath, file); // 组装文件的完整路径
              const stats = await fs.stat(filePath); // 获取文件的详细信息
              if (stats.isDirectory()) {
                await deleteAllFilesInDir(filePath); // 递归删除子目录下的所有文件
                await fs.rmdir(filePath); // 删除子目录
              } else {
                await fs.unlink(filePath); // 删除文件
              }
            }));
          }


          // await fStream.rm(`${base_directory}/${team_id}`, { recursive: true, force: true }, (err) => {
          //   if (err) {
          //     console.error(err);
          //   }
          // });

          // return res.status(200).send("ok");
          await deleteFile(`${base_directory}/${team_id}`).then(() => {
              return downloadAllFiles();
          }).then(async () => {
            // console.log('所有文件已下载完成');
            // console.log("@@ files downloaded");
            const docker =
              process.env.DOCKER === "remote"
                ? new Docker({
                  host: process.env.DOCKER_URL,
                  port: process.env.DOCKER_PORT,
                })
                : new Docker();
            let containerRunning = false;
            try {
              const containerList = await docker.listContainers();
              containerList.forEach((containerInfo) => {
                if (containerInfo.Names.includes(`/THUAI6_Compiler_${team_id}`)) {
                  containerRunning = true;
                }
              });
              if (!containerRunning) {
                const url =
                  process.env.NODE_ENV == "production"
                    ? "https://api.eesast.com/code/compileInfo"
                    : "http://172.17.0.1:28888/code/compileInfo";
                const compiler_token = jwt.sign(
                  {
                    team_id: team_id,
                  } as JwtCompilerPayload,
                  process.env.SECRET!,
                  {
                    expiresIn: "10m",
                  }
                );
                const container = await docker.createContainer({
                  Image: process.env.COMPILER_IMAGE,
                  Env: [
                    `URL=${url}`,
                    `TOKEN=${compiler_token}`
                  ],
                  HostConfig: {
                    Binds: [`${base_directory}/${team_id}:/usr/local/mnt`],
                    AutoRemove: true,
                    NetworkMode: "host"
                  },
                  AttachStdin: false,
                  AttachStdout: false,
                  AttachStderr: false,
                  //StopTimeout: parseInt(process.env.MAX_COMPILER_TIMEOUT as string),
                  name: `THUAI6_Compiler_${team_id}`
                });
                await client.request(
                  gql`
                mutation update_compile_status(
                  $team_id: uuid!
                  $status: String
                  $contest_id: uuid
                ) {
                  update_contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}, _set: {status: $status}) {
                    returning {
                      status
                    }
                  }
                }
              `,
                  {
                    contest_id: process.env.GAME_ID,
                    team_id: team_id,
                    status: "compiling",
                  }
                );
                await container.start();
                // console.log("@@ docker started");
              }
            } catch (err) {
              return res.status(400).send(err);
            }
          }).catch((err) => {
            // return err;
            return new Promise((resolve, reject) => {
              reject(err)
            })
          });
        } catch (err) {
          return res.status(400).send(`STS选手代码下载失败:${err}`);
        }

      } catch (err) {
        return res.status(400).send(err);
      }
      return res.status(200).send("ok!");
    });
  } catch (err) {
    return res.send(err);
  }
});

/**
 * PUT compile info
 */
router.put("/compileInfo", async (req, res) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }

      const payload = decoded as JwtCompilerPayload;
      const team_id = payload.team_id;
      const compile_status: string = req.body.compile_status;
      console.log(`${team_id}:compile:${compile_status}`);
      if (compile_status != "compiled" && compile_status != "failed")
        return res.status(400).send("error: implicit compile status");
      try {
        await client.request(
          gql`
            mutation update_compile_status($team_id: uuid!, $status: String, $contest_id: uuid) {
              update_contest_team(where: {_and: [{contest_id: {_eq: $contest_id}}, {team_id: {_eq: $team_id}}]}, _set: {status: $status}) {
                returning {
                  status
                }
              }
            }
          `,
          {
            contest_id: process.env.GAME_ID,
            team_id: team_id,
            status: compile_status,
          }
        );
        return res.status(200).send("compile_info ok!");
      } catch (err) {
        return res.status(400).send(err);
      }
    });
  } catch (err) {
    return res.status(400).send(err);
  }
});

/**
 * GET compile logs
 * @param {token}
 * @param {string} team_id
 * @param {number} usr_seq
 */
router.get("/logs/:team_id/:usr_seq", async (req, res) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    return res.status(401).send("401 Unauthorized: Missing token");
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).send("401 Unauthorized: Token expired or invalid");
    }

    const payload = decoded as JwtPayload;
    const user_id = payload._id;
    const team_id = req.params.team_id;
    const usr_seq = req.params.usr_seq;
    const query_if_manager = await client.request(
      gql`
        query query_is_manager($contest_id: uuid, $user_id: String) {
          contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
            user_id
          }
        }
      `,
      { contest_id: process.env.GAME_ID, user_id: user_id }
    );
    const is_manager = query_if_manager.contest_manager != null;
    if (is_manager) {
      const query_if_team_exists = await client.request(
        gql`
          query query_team_exists($contest_id: uuid, $team_id: uuid!) {
            contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}) {
              team_id
            }
          }
        `,
        { contest_id: process.env.GAME_ID, team_id: team_id }
      );
      const team_exists = query_if_team_exists.contest_team != null;
      if (team_exists) {
        try {
          res.set("Cache-Control", "no-cache");
          res.set("Expires", "0");
          res.set("Pragma", "no-cache");
          return res
            .status(200)
            .sendFile(`${base_directory}/${team_id}/compile_log${usr_seq}.txt`, {
              cacheControl: false,
            });
        } catch (err) {
          return res.status(400).send(err);
        }
      } else return res.status(404).send("队伍不存在！");
    } else {
      try {
        const query_in_team = await client.request(
          gql`
            query query_if_in_team($team_id: uuid, $user_id: String, $contest_id: uuid) {
              contest_team(
                where: {
                  _and: [
                    { contest_id: { _eq: $contest_id } }
                    { team_id: { _eq: $team_id } }
                    {
                      _or: [
                        { team_leader: { _eq: $user_id } }
                        { contest_team_members: { user_id: { _eq: $user_id } } }
                      ]
                    }
                  ]
                }
              ) {
                team_id
              }
            }
          `,
          {
            contest_id: process.env.GAME_ID,
            team_id: team_id,
            user_id: user_id,
          }
        );
        const is_in_team = query_in_team.thuai.length != 0;
        if (is_in_team) {
          res.set("Cache-Control", "no-cache");
          res.set("Expires", "0");
          res.set("Pragma", "no-cache");
          return res
            .status(200)
            .sendFile(`${base_directory}/${team_id}/compile_log${usr_seq}.txt`, {
              cacheControl: false,
            });
        } else
          return res.status(401).send("401 Unauthorized:Permission denied");
      } catch (err) {
        return res.status(400).send(err);
      }
    }
  });
});

export default router;
