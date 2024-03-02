import express from "express";
import Docker from "dockerode";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";
import getSTS from "../helpers/sts";
import fStream from 'fs';
import COS from "cos-nodejs-sdk-v5";
import { join } from "path";
import { base_directory, get_contest_name } from "../helpers/utils";

const router = express.Router();

interface JwtCompilerPayload {
  team_id: string;
  contest_id: string;
}

interface Url {
  key: string;
  path: string;
}

/**
 * POST compile code of team_id
 * @param token (user_uuid)
 * @param {uuid} req.body.contest_id
 * @param {uuid} req.body.team_id
 */
// query whether is manager, query whether is in team
router.post("/compile", async (req, res) => {
  try {
    const contest_id = req.body.contest_id;
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
      const payload = decoded as JwtUserPayload;
      const user_uuid = payload.uuid;
      try {
        const query_if_manager = await client.request(
          gql`
            query query_is_manager($contest_id: uuid, $user_uuid: String) {
              contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_uuid: {_eq: $user_uuid}}}) {
                user_uuid
              }
            }
          `,
          { 
            contest_id: contest_id, 
            user_uuid: user_uuid 
          }
        );
        const is_manager = query_if_manager.contest_manager.length != 0;
        if (!is_manager) {
          const query_in_team = await client.request(
            gql`
              query query_if_in_team($team_id: uuid, $user_uuid: String, $contest_id: uuid) {
                contest_team(
                  where: {
                    _and: [
                      { contest_id: { _eq: $contest_id } }
                      { team_id: { _eq: $team_id } }
                      {
                        _or: [
                          { team_leader_uuid: { _eq: $user_uuid } }
                          { contest_team_members: { user_uuid: { _eq: $user_uuid } } }
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
              contest_id: contest_id, 
              team_id: team_id, 
              user_uuid: user_uuid 
            }
          );
          const is_in_team = query_in_team.contest_team.length != 0;
          if (!is_in_team) {
            return res.status(401).send("当前用户不在队伍中");
          }
        }

        const contest_name = await get_contest_name(contest_id);

        await fs.mkdir(`${base_directory}/${contest_name}/code/${team_id}`, {
          recursive: true,
          mode: 0o775,
        });

        const player_num = 5;
        let query_string = "";
        for (let i = 0;i < player_num; ++i) {
          const j = i + 1;
          query_string += `
            code${j}
            code_type${j}
          `
        }
        const get_contest_codes = await client.request(
          gql`query get_team_codes($team_id: uuid){
            contest_code(where: {team_id: {_eq: $team_id}}) {
              ${query_string}
            }
          }`,
          { 
            team_id: team_id 
          }
        );

        //判断是否为cpp或python
        for (let i = 0;i < player_num; ++i) {
          const j = i + 1;
          if ((get_contest_codes.contest_code[0]['code_type' + j] != "cpp" && get_contest_codes.contest_code[0]['code_type' + j] != "py") ||
          !get_contest_codes.contest_code[0]['code' + j]) {
            return res.status(400).send("未完成全部文件上传");
          }
        }

        console.log("start to get sts")
        const sts = await getSTS([
          "name/cos:GetObject",
          "name/cos:DeleteObject",
          "name/cos:HeadObject",
        ], "*");
        console.log("start to cos")
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
              console.log(err);
            }
          }
        });

        const config = {
          bucket: process.env.COS_BUCKET!,
          region: 'ap-beijing',
        };

        console.log('start to get object')
        const downloadObject = async function downloadObject(key: string, outputPath: string): Promise<boolean> {
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

        const urls: Url[] = [];
        const codes = get_contest_codes.contest_code[0];
        for (let i = 0;i < player_num; ++i) {
          const j = i + 1;
          urls.push({ key: `${codes['code' + j]}`, path: `${base_directory}/${contest_name}/code/${team_id}/player${j}.${codes['code_type' + j]}`});
        }
        const downloadAllFiles = async function downloadAllFiles() {
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

        await deleteFile(`${base_directory}/${contest_name}/code/${team_id}`);

        await downloadAllFiles();

        const docker =
          process.env.DOCKER === "remote"
            ? new Docker({
              host: process.env.DOCKER_URL,
              port: process.env.DOCKER_PORT,
            })
            : new Docker();
        let containerRunning = false;
        const containerList = await docker.listContainers();
        containerList.forEach((containerInfo) => {
          if (containerInfo.Names.includes(`/${contest_name}_Compiler_${team_id}`)) {
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
              contest_id: contest_id,
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
              Binds: [`${base_directory}/${contest_name}/code/${team_id}:/usr/local/mnt`],
              AutoRemove: true,
              NetworkMode: "host"
            },
            AttachStdin: false,
            AttachStdout: false,
            AttachStderr: false,
            //StopTimeout: parseInt(process.env.MAX_COMPILER_TIMEOUT as string),
            name: `${contest_name}_Compiler_${team_id}`
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
              contest_id: contest_id,
              team_id: team_id,
              status: "compiling",
            }
          );
          await container.start();
          if(process.env.NODE_ENV !== "production"){
            return res.status(200).json({compiler_token});
          }
        }
        res.status(200).send("ok!");
      } catch (err: unknown) {
          return res.status(400).send(err?.toString());
      }
    });
  } catch (err: unknown) {
    return res.status(400).send(err?.toString());
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
      const contest_id = payload.contest_id;
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
            contest_id: contest_id,
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
 * @param {uuid} contest_id
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

    const payload = decoded as JwtUserPayload;
    const user_uuid = payload.uuid;
    const contest_id = req.body.contest_id;
    const team_id = req.params.team_id;
    const usr_seq = req.params.usr_seq;
    const contest_name = await get_contest_name(contest_id);
    const query_if_manager = await client.request(
      gql`
        query query_is_manager($contest_id: uuid, $user_uuid: String) {
          contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_uuid: {_eq: $user_uuid}}}) {
            user_uuid
          }
        }
      `,
      { 
        contest_id: contest_id, 
        user_uuid: user_uuid 
      }
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
        { 
          contest_id: contest_id, 
          team_id: team_id 
        }
      );
      const team_exists = query_if_team_exists.contest_team != null;
      if (team_exists) {
        try {
          res.set("Cache-Control", "no-cache");
          res.set("Expires", "0");
          res.set("Pragma", "no-cache");
          return res
            .status(200)
            .sendFile(`${base_directory}/${contest_name}/code/${team_id}/compile_log${usr_seq}.txt`, {
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
            query query_if_in_team($team_id: uuid, $user_uuid: String, $contest_id: uuid) {
              contest_team(
                where: {
                  _and: [
                    { contest_id: { _eq: $contest_id } }
                    { team_id: { _eq: $team_id } }
                    {
                      _or: [
                        { team_leader_uuid: { _eq: $user_uuid } }
                        { contest_team_members: { user_uuid: { _eq: $user_uuid } } }
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
            contest_id: contest_id,
            team_id: team_id,
            user_uuid: user_uuid,
          }
        );
        const is_in_team = query_in_team.contest_team.length != 0;
        if (is_in_team) {
          res.set("Cache-Control", "no-cache");
          res.set("Expires", "0");
          res.set("Pragma", "no-cache");
          return res
            .status(200)
            .sendFile(`${base_directory}/${contest_name}/code/${team_id}/compile_log${usr_seq}.txt`, {
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
