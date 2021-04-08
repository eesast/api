import express from "express";
import Docker from "dockerode";
import { gql } from "graphql-request";
import { client } from "..";
//import {docker_queue} from "..";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
//import shell from "child_process";

const router = express.Router();

/**
 * @param token (user_id)
 * @param {uuid} room_id
 */
//network, server, client, run shell to clear network
router.post("/", async (req, res) => {
  try {
    const room_id = req.body.room_id;
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
      //const user_id = req.body.user_id;
      try {
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
          console.log("dosomething");
          return res.status(200).send("ok");
        } else {
          try {
            //查询选手是否在房间里
            const query_if_in_room = gql`
              query MyQuery($_eq: uuid!, $_eq1: String) {
                thuai_room_team(
                  where: {
                    room_id: { _eq: $_eq }
                    thuai_team: {
                      _or: [
                        { team_leader: { _eq: $_eq1 } }
                        { team_members: { user_id: { _eq: $_eq1 } } }
                      ]
                    }
                  }
                ) {
                  thuai_team_id
                }
              }
            `;
            const if_in_room = await client.request(query_if_in_room, {
              _eq: room_id,
              _eq1: user_id,
            });
            if (if_in_room.thuai_room_team.length === 0)
              return res.status(400).send("permission denied: not in room");
          } catch (err) {
            return res.status(400).send(err);
          }
          const docker =
            process.env.DOCKER === "remote"
              ? new Docker({
                  host: process.env.DOCKER_URL,
                  port: process.env.DOCKER_PORT,
                })
              : new Docker();
          try {
            //查询参赛队伍
            const query_teams = await client.request(
              gql`
                query MyQuery($_eq: uuid!) {
                  thuai_room_team_aggregate(where: { room_id: { _eq: $_eq } }) {
                    nodes {
                      thuai_team_id
                    }
                  }
                }
              `,
              {
                _eq: room_id,
              }
            );
            const teams = query_teams.thuai_room_team_aggregate.nodes;
            if (teams.length != 2) {
              res.status(400).send("team not exist or unsufficient");
            }

            try {
              const existing_networks = await docker.listNetworks();
              if (
                !existing_networks.filter(
                  (elem) => elem.Name === `THUAI4_room_${room_id}`
                ).length
              ) {
                await docker.createNetwork({
                  Name: `THUAI4_room_${room_id}`,
                });
              }
            } catch (err) {
              return res.status(400).send("can't create network");
            }

            let containerRunning = false;
            const containerList = await docker.listContainers();
            containerList.forEach((containerInfo) => {
              if (
                containerInfo.Names.includes(
                  `/THUAI4_room_server_${room_id}`
                ) ||
                containerInfo.Names.includes(`/THUAI4_room_client_${room_id}`)
              ) {
                containerRunning = true;
              }
            });
            if (!containerRunning) {
              try {
                const container_server = await docker.createContainer({
                  Image: process.env.SERVER_IMAGE,
                  Tty: true,
                  AttachStdin: false,
                  AttachStdout: false,
                  AttachStderr: false,
                  name: `THUAI4_room_server_${room_id}`,
                  HostConfig: {
                    NetworkMode: `THUAI4_room_${room_id}`,
                    AutoRemove: true,
                  },
                  Cmd: [process.env.MAX_SERVER_TIMEOUT as string, "2", "4"],
                });
                await container_server.start();
              } catch (err) {
                return res.status(400).send(`can't create server ${room_id}`);
              }

              const network = docker.getNetwork(`THUAI4_room_${room_id}`);
              const netInfo = (await network.inspect()) as Docker.NetworkInspectInfo;
              const roomIp = Object.values(
                netInfo.Containers!
              )[0].IPv4Address.split("/")[0];

              try {
                const container_client = await docker.createContainer({
                  Image: process.env.AGENTCLIENT_IMAGE,
                  AttachStdin: false,
                  AttachStdout: false,
                  AttachStderr: false,
                  name: `THUAI4_room_client_${room_id}`,
                  HostConfig: {
                    NetworkMode: `THUAI4_room_${room_id}`,
                    AutoRemove: true,
                    Binds: [
                      `/data/thuai4/${teams[0].thuai_team_id}/player:/usr/local/mnt/player1`,
                      `/data/thuai4/${teams[1].thuai_team_id}/player:/usr/local/mnt/player2`,
                    ],
                  },
                  Cmd: [`${roomIp}`, process.env.MAX_CLIENT_TIMEOUT as string],
                });
                await container_client.start();
              } catch (err) {
                return res.status(400).send(`can't create client ${room_id}`);
              }

              return res.status(200).send("all ok");
            } else {
              return res.status(400).send("container running");
            }
          } catch (err) {
            return res.status(400).send(err);
          }
        }
      } catch (err) {
        return res.status(400).send(err);
      }
    });
  } catch (err) {
    return res.status(400).send(err);
  }
});

/**DELETE room network (only manager can delete network)
 * @param token (user_id)
 * @param {list} req.body.rooom_ids
 */
router.delete("/", async (req, res) => {
  const room_ids = req.body.room_ids;
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
    const docker =
      process.env.DOCKER === "remote"
        ? new Docker({
            host: process.env.DOCKER_URL,
            port: process.env.DOCKER_PORT,
          })
        : new Docker();
    try {
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
        room_ids.forEach(async (room_id: string) => {
          try {
            const room_network = docker.getNetwork(`THUAI4_room_${room_id}`);
            await room_network.remove();
          } catch (err) {
            return res.status(400).send(`can't delete room ${room_id}`);
          }
        });
      } else {
        return res.status(401).send("401 Unauthorized: Permission denied.");
      }
    } catch (err) {
      return res.status(400).send(err);
    }
  });
});

export default router;