import express from "express";
import Docker from "dockerode";
import * as fs from "fs/promises";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";

const router = express.Router();

/**
 * POST compile code of team_id
 * @param token (user_id)
 * @param {uuid} req.body.team_id
 */
// query whether is manager, query whether is in team
// docker暂时使用THUAI3,命名为`THUAI_Compiler_${team_id}_player${i}`，数据卷挂在/data/thuai4/${team_id}/player${i}
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
              query MyQuery($team_id: uuid, $user_id: String) {
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
                query MyQuery($team_id: uuid!) {
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
              await fs.mkdir(`/data/thuai4/${team_id}/`, {
                recursive: true,
                mode: 0o775,
              });
            } catch (err) {
              return res.status(400).send("can't mkdir");
            }
            for (const code_key in player_code) {
              try {
                await fs.writeFile(
                  `/data/thuai4/${team_id}/player${i}.cpp`,
                  player_code[code_key],
                  "utf-8"
                );
              } catch (err) {
                return res.status(400).send("can't write file");
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
                const container = await docker.createContainer({
                  Image: process.env.COMPILER_IMAGE,
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

                await container.start();
              }
            } catch (err) {
              return res.status(400).send(err);
            }
          } else {
            return res
              .status(401)
              .send("Permission denied, you are not in the team.");
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

//TODO: add manager clear docker containers manually

export default router;
