import express from "express";
import Docker from "dockerode";
import * as fs from "fs/promises";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";
import { getOSS } from "../helpers/oss";

const router = express.Router();
const base_directory = process.env.DOCKER === "remote" ? '/data/thuai5/' : '/mnt/d/软件部/thuai5/';

interface JwtCompilerPayload {
  team_id: string;
}

router.post("/testoss", async (req, res) => {
  try {
    const oss = await getOSS();
    if (req.body.mode == "listsub") {
      const result = await oss.list({
        prefix: req.body.str1,  //'THUAI5/'
        delimiter: req.body.str2    //'/'
      });
      result.prefixes.forEach((subDir: any) => {
        console.log('SubDir: %s', subDir);
      });
      result.objects.forEach((obj: any) => {
        console.log('Object: %s', obj.name);
      });
    }
    else if (req.body.mode == "upload") {
      let result = await oss.put(req.body.str1, req.body.str2);
      console.log(result);
    }
    else if (req.body.mode == "delete") {
      let result = await oss.delete(req.body.str1);
      console.log(result);
    }
    return res.status(200);
  } catch (e) {
    return res.status(400).send(`failed: ${e}`);
  }
})


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
      const query_if_manager = await client.request(
        gql`
          query query_is_manager($contest_id: uuid, $user_id: String) {
            contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
              user_id
            }
          }
        `,
        { contest_id: process.env.GAMEID, user_id: user_id }
      );
      const is_manager = query_if_manager.contest_manager != null;
      if (!is_manager) {
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
            {contest_id: process.env.GAMEID, team_id: team_id, user_id: user_id}
          );
          const is_in_team = query_in_team.contest_team.length != 0;
          if (!is_in_team) return res.status(401).send("当前用户不在队伍中");
        } catch (err) {
          return res.status(400).send(err);
        }
      }

      try {
        try {
          await fs.mkdir(`${base_directory}/${team_id}`, {
            recursive: true,
            mode: 0o775,
          });
        } catch (err) {
          return res.status(400).send("文件存储目录创建失败");
        }
        try {
          const oss = await getOSS();
          oss.get(`/THUAI5/${team_id}/player1.cpp`, `${base_directory}/${team_id}/player1.cpp`);
          oss.get(`/THUAI5/${team_id}/player2.cpp`, `${base_directory}/${team_id}/player2.cpp`);
          oss.get(`/THUAI5/${team_id}/player3.cpp`, `${base_directory}/${team_id}/player3.cpp`);
          oss.get(`/THUAI5/${team_id}/player4.cpp`, `${base_directory}/${team_id}/player4.cpp`);
        } catch (err) {
          return res.status(400).send(`OSS选手代码下载失败:${err}`);
        }

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
            if (containerInfo.Names.includes(`/THUAI5_Compiler_${team_id}`)) {
              containerRunning = true;
            }
          });

          if (!containerRunning) {
            const url =
                process.env.NODE_ENV == "production"
                  ? "https://api.eesast.com/code/compileInfo"
                  : "http://localhost:28888/code/compileInfo";
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
              name: `THUAI5_Compiler_${team_id}`
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
                contest_id: process.env.GAMEID,
                team_id: team_id,
                status: "compiling",
              }
            );
            await container.start();
          }
        } catch (err) {
          return res.status(400).send(err);
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
            contest_id: process.env.GAMEID,
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
 */
router.get("/logs/:team_id", async (req, res) => {
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
    const query_if_manager = await client.request(
      gql`
        query query_is_manager($contest_id: uuid, $user_id: String) {
          contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
            user_id
          }
        }
      `,
      { contest_id: process.env.GAMEID, user_id: user_id }
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
        { contest_id: process.env.GAMEID, team_id: team_id }
      );
      const team_exists = query_if_team_exists.contest_team != null;
      if (team_exists) {
        try {
          res.set("Cache-Control", "no-cache");
          res.set("Expires", "0");
          res.set("Pragma", "no-cache");
          return res
            .status(200)
            .sendFile(`${base_directory}/${team_id}/compile_log.txt`, {
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
            contest_id: process.env.GAMEID,
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
            .sendFile(`${base_directory}/${team_id}/compile_log.txt`, {
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
