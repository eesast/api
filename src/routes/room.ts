import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../middlewares/authenticate";
import * as fs from "fs/promises";

const router = express.Router();
export const base_directory = process.env.NODE_ENV === "production" ? '/data/thuai6/' : '/home/guoyun/thuai6';

/**
 * @param token (user_id)
 * @param {uuid} room_id
 * @param {boolean} team_seq
 * @param {number} map
 * @param {number} exposed
 */

router.post("/", async (req, res) => {
  try {
    console.log("needed");
    const room_id = req.body.room_id;
    const team_seq = req.body.team_seq as boolean;
    const map = req.body.map as number;
    const exposed = req.body.exposed as number;
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

      try {
          //查询选手是否在房间里
          const if_in_room = await client.request(
            gql`
              query query_if_in_room($room_id: uuid!, $user_id: String) {
                contest_room_team(where: {_and: {room_id: {_eq: $room_id}, contest_team: {_or: [{team_leader: {_eq: $user_id}}, {contest_team_members: {user_id: {_eq: $user_id}}}]}}}) {
                  team_id
                }
              }
            `,
            {
              room_id: room_id,
              user_id: user_id
            }
          );
          if (if_in_room.contest_room_team.length === 0)
            return res.status(400).send("permission denied: not in room");
          try {
            const current_team_id =
              if_in_room.contest_room_team[0].team_id;
            //查询参赛队伍
            const query_teams = await client.request(
              gql`
                query query_teams($room_id: uuid!) {
                  contest_room_team(where: {room_id: {_eq: $room_id}}) {
                    team_id
                  }
                }
              `,
              {
                room_id: room_id
              }
            );
            const teams = query_teams.contest_room_team;
            if (teams.length != 2) {
              res.status(400).send("队伍信息错误");
            }
            const team_withseq = ["", ""] as string[];
            team_withseq[Number(team_seq)] = current_team_id;
            team_withseq[1 - Number(team_seq)] =
              current_team_id == teams[0].team_id ? teams[1].team_id : teams[0].team_id;
            try {
              await fs.mkdir(`${base_directory}/playback/${room_id}`, {
                recursive: true,
                mode: 0o775,
              });
            } catch (err) {
              return res.status(400).send("文件存储目录创建失败");
            }

            docker_queue.push({
              room_id: room_id,
              team_id_1: team_withseq[0],
              team_id_2: team_withseq[1],
              map: map,
              mode: 0,
              exposed: exposed,
            });
            return res.status(200).json({exposed: exposed});
          } catch (err) {
            return res.status(400).send(err);
          }
        } catch (err) {
          return res.status(400).send(err);
        }
    });
  } catch (err) {
    return res.status(400).send(err);
  }
});

/**
 * @param token (user_id)
 * @param {uuid} team_id1
 * @param {uuid} team_id2
 */
router.post("/assign", async (req, res) => {
  console.log("needed");
  try{
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
      const exposed = req.body.exposed as number;
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
      const is_manager = query_if_manager.contest_manager.lenth != 0;
      if (!is_manager) {
        return res
        .status(400)
        .send("Permission Denied: Need Permission Elevation");
      }
      const query_valid_teams = await client.request(
        gql`
          query query_valid_teams($contest_id: uuid) {
            contest_team(where: {contest_id: {_eq: $contest_id}, status: {_eq: "compiled"}}) {
              team_id
            }
          }
        `,
        { contest_id: process.env.GAME_ID }
      );
      const valid_team_ids = query_valid_teams.contest_team;
      if (valid_team_ids.find((item: any) => item.team_id == req.body.team_id1) == undefined || valid_team_ids.find((item: any) => item.team_id == req.body.team_id2) == undefined)
        return res.status(400).send("requested team not compiled");
      docker_queue.push({
        room_id: `${req.body.team_id1}--vs--${req.body.team_id2}`,
        team_id_1: req.body.team_id1,
        team_id_2: req.body.team_id2,
        map: 1,
        mode: 1,
        exposed: exposed
      });
      return res.status(200).send("successfully assigned!");
    })
  }
  catch (err) {
    return res.status(400).send(err);
  }
});

/**
 * GET playback file
 * @param {uuid} id
 * @param {int} mode 0代表存在实际room的对战，1代表不存在实际room的对战
 */
router.get("/:room_id", async (req, res) => {
  try {
    const room_id = req.params.room_id;
    // const query_room = await client.request(
    //   gql`
    //     query query_room($room_id: uuid!) {
    //       contest_room(where: {room_id: {_eq: $room_id}}) {
    //         room_id
    //       }
    //     }
    //   `,
    //   { room_id: room_id }
    // );
    // if (query_room.contest_room.length == 0)
    //   return res.status(400).send("room does not exist");
    try {
      await fs.access(`${base_directory}/playback/${room_id}/video.thuaipb`);
      res.setHeader(
        "Content-Disposition",
        "attachment;filename=video.thuaipb"
      );
      return res
        .status(200)
        .sendFile(`${base_directory}/playback/${room_id}/video.thuaipb`);
    } catch (err: any) {
      if (err.code == "ENOENT") return res.status(404).send("文件不存在");
      return res.status(400).send(err);
    }
  } catch (err) {
    return res.status(404).send(err);
  }
});

export default router;
