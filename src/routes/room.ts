import express from "express";
import Docker from "dockerode";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import * as fs from "fs/promises";

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
              query query_if_in_room($_eq: uuid!, $_eq1: String) {
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
          try {
            //查询参赛队伍
            const query_teams = await client.request(
              gql`
                query query_team_id($_eq: uuid!) {
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
              res.status(400).send("队伍信息错误");
            }

            docker_queue.push({
              room_id: room_id,
              team_id_1: teams[0].thuai_team_id,
              team_id_2: teams[1].thuai_team_id,
            });
            return res.status(200).send("Joined queue!");
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

/**
 * GET playback file
 * 文件在/data/thuai4_playback/${room_id}.plb
 * @param {uuid} id
 */
router.get("/:room_id", async (req, res) => {
  try {
    const room_id = req.params.room_id;
    const query_room = await client.request(
      gql`
        query query_room_id($room_id: uuid!) {
          thuai_room_by_pk(room_id: $room_id) {
            room_id
          }
        }
      `,
      { room_id: room_id }
    );
    if (query_room.thuai_room_by_pk.length == 0)
      return res.status(400).send("room does not exist");
    const root_location = "/data/thuai4_playback/";
    try {
      await fs.access(root_location + `${room_id}/${room_id}.plb`);
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Expires", 0);
      return res
        .status(200)
        .sendFile(root_location + `${room_id}/${room_id}.plb`, {
          cacheControl: false,
        });
    } catch (err) {
      if (err.code == "ENOENT") return res.status(404).send("文件不存在");
      return res.status(400).send(err);
    }
  } catch (err) {
    return res.status(404).send(err);
  }
});

export default router;
