import express from "express";
import Docker from "dockerode";
import * as fs from "fs/promises";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";

const router = express.Router();

interface JwtCompilerPayload {
  team_id: string;
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
      const query_if_manager = await client.request(
        gql`
          query query_is_manager($manager_id: String!) {
            thuai_manager_by_pk(manager_id: $manager_id) {
              manager_id
            }
          }
        `,
        { manager_id: user_id }
      );
      const is_manager = query_if_manager.thuai_manager_by_pk != null;
      if (is_manager) {
        console.log("to be continued");
      } else {
        try {
          //uncomment this to enable only team leader to compile
          // const query_is_leader = await client.request(gql`
          //   query MyQuery($team_id: uuid!) {
          //     thuai_by_pk(team_id: $team_id) {
          //       team_leader
          //     }
          //   }
          // `,{
          //   team_id:team_id
          // });
          // const is_in_team = (query_is_leader.thuai_by_pk.team_leader === user_id);
          //end comment

          //uncomment this to allow anyone in team to compile
          const query_in_team = await client.request(
            gql`
              query query_if_in_team($team_id: uuid, $user_id: String) {
                thuai(
                  where: {
                    _and: [
                      { team_id: { _eq: $team_id } }
                      {
                        _or: [
                          { team_leader: { _eq: $user_id } }
                          { team_members: { user_id: { _eq: $user_id } } }
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
              team_id: team_id,
              user_id: user_id,
            }
          );
          console.log(query_in_team);
          const is_in_team = query_in_team.thuai.length != 0;
          //end comment

          if (is_in_team) {
            const result = await client.request(
              gql`
                query get_team_code($team_id: uuid!) {
                  thuai_code_by_pk(team_id: $team_id) {
                    code_1
                    code_2
                    code_3
                    code_4
                  }
                }
              `,
              {
                team_id: team_id,
              }
            );
            let i = 1;
            const player_code = result.thuai_code_by_pk;
            try {
              await fs.mkdir(`/data/thuai4/${team_id}/player`, {
                recursive: true,
                mode: 0o775,
              });
              await fs.mkdir(`/data/thuai4/${team_id}/cpp`, {
                recursive: true,
                mode: 0o775,
              });
            } catch (err) {
              return res.status(400).send("服务器创建目录失败");
            }
            for (const code_key in player_code) {
              try {
                await fs.writeFile(
                  `/data/thuai4/${team_id}/cpp/player${i}.cpp`,
                  player_code[code_key],
                  "utf-8"
                );
              } catch (err) {
                return res.status(400).send("服务器写入文件失败");
              }
              ++i;
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
                if (
                  containerInfo.Names.includes(`/THUAI4_Compiler_${team_id}`)
                ) {
                  containerRunning = true;
                }
              });

              if (!containerRunning) {
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
                  Env: [`COMPILER_TOKEN=${compiler_token}`],
                  HostConfig: {
                    Binds: [`/data/thuai4/${team_id}/:/usr/local/mnt`],
                    AutoRemove: true,
                  },
                  AttachStdin: false,
                  AttachStdout: false,
                  AttachStderr: false,
                  //StopTimeout: parseInt(process.env.MAX_COMPILER_TIMEOUT as string),
                  name: `THUAI4_Compiler_${team_id}`,
                });

                await client.request(
                  gql`
                    mutation update_compile_status(
                      $team_id: uuid!
                      $status: String
                    ) {
                      update_thuai_by_pk(
                        pk_columns: { team_id: $team_id }
                        _set: { status: $status }
                      ) {
                        status
                      }
                    }
                  `,
                  {
                    team_id: team_id,
                    status: "compiling",
                  }
                );

                await container.start();
              }
            } catch (err) {
              return res.status(400).send(err);
            }
          } else {
            return res.status(401).send("当前用户不在队伍中");
          }
        } catch (err) {
          return res.status(400).send(err);
        }
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
            mutation update_compile_status($team_id: uuid!, $status: String) {
              update_thuai_by_pk(
                pk_columns: { team_id: $team_id }
                _set: { status: $status }
              ) {
                status
              }
            }
          `,
          {
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
        query query_is_manager($manager_id: String!) {
          thuai_manager_by_pk(manager_id: $manager_id) {
            manager_id
          }
        }
      `,
      { manager_id: user_id }
    );
    const is_manager = query_if_manager.thuai_manager_by_pk != null;
    if (is_manager) {
      const query_if_team_exists = await client.request(
        gql`
          query query_team_exists($team_id: uuid!) {
            thuai_by_pk(team_id: $team_id) {
              team_id
            }
          }
        `,
        {
          team_id: team_id,
        }
      );
      const team_exists = query_if_team_exists.thuai_by_pk != null;
      if (team_exists) {
        try {
          return res
            .status(200)
            .sendFile(`/data/thuai4/${team_id}/player/out.log`);
        } catch (err) {
          return res.status(400).send(err);
        }
      } else return res.status(404).send("队伍不存在！");
    } else {
      try {
        const query_in_team = await client.request(
          gql`
            query query_in_team($team_id: uuid, $user_id: String) {
              thuai(
                where: {
                  _and: [
                    { team_id: { _eq: $team_id } }
                    {
                      _or: [
                        { team_leader: { _eq: $user_id } }
                        { team_members: { user_id: { _eq: $user_id } } }
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
            team_id: team_id,
            user_id: user_id,
          }
        );
        const is_in_team = query_in_team.thuai.length != 0;
        if (is_in_team) {
          res.setHeader("Cache-Control", "no-cache");
          return res
            .status(200)
            .sendFile(`/data/thuai4/${team_id}/player/out.log`);
        } else
          return res.status(401).send("401 Unauthorized:Permission denied");
      } catch (err) {
        return res.status(400).send(err);
      }
    }
  });
});

//TODO: add manager clear docker containers manually

export default router;
