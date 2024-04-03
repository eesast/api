import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import jwt from "jsonwebtoken";
// import { JwtUserPayload } from "../middlewares/authenticate";
import * as fs from "fs/promises";
import { get_base_directory } from "../helpers/utils";
import authenticate, { JwtArenaPayload } from "../middlewares/authenticate";
import { TeamLabelBind, ContestResult, PlayerCodes } from "../helpers/utils";
import * as hasura from "../helpers/hasura"


const router = express.Router();



/**
 * @param token
 * @param {string} contest_name
 * @param {uuid} map_id
 * @param {TeamLabelBind[]} team_labels
 */

  //// 鉴权。检查登录状态
  //// 检查contest表中的arena_switch是否为true
  //// 检查用户是否在队伍中，或者是管理员
  //// 后端也要检查，限制一支队伍的开战频率。
  //// 后端也要检查数据库上的代码编译状态和角色代码分配状态，都正常的情况下再继续下一步。


router.post("/create", authenticate(), async (req, res) => {
  const contest_name = req.body.contest_name;
  const map_id = req.body.map_id;
  const team_labels: TeamLabelBind[] = req.body.team_labels;
  const user_uuid = req.auth.user.uuid;
  console.log("contest_name: ", contest_name);
  console.log("map_id: ", map_id);
  console.log("team_labels: ", team_labels);
  console.log("user_uuid: ", user_uuid);
  if (!contest_name || !team_labels || !map_id || !user_uuid || team_labels.length < 2) {
    return res.status(422).send("422 Unprocessable Entity: Missing credentials");
  }

  const contest_id = await hasura.get_contest_id(contest_name);
  console.log("contest_id: ", contest_id);
  if (!contest_id) {
    return res.status(400).send("400 Bad Request: Contest not found");
  }

  const arena_switch = await hasura.get_contest_settings(contest_id)?.arena_switch ?? false;
  console.log("arena_switch: ", arena_switch);
  if (!arena_switch) {
    return res.status(403).send("403 Forbidden: Arena is not open");
  }

  const is_manager = await hasura.get_maneger_from_user(user_uuid, contest_id);
  console.log("is_manager: ", is_manager);
  if (!is_manager) {
    const user_team_id = await hasura.get_team_from_user(user_uuid, contest_id);
    console.log("user_team_id: ", user_team_id);
    if (!user_team_id) {
      return res.status(403).send("403 Forbidden: User not in team");
    } else if (user_team_id !== team_labels[0].team_id) {
      return res.status(403).send("403 Forbidden: User not in team");
    }
  }

  const active_rooms = hasura.count_room_team(contest_id, team_labels[0].team_id);
  console.log("active_rooms: ", active_rooms);
  if (active_rooms > 6) {
    return res.status(423).send("423 Locked: Request arena too frequently");
  }

  let teams_codes = {} as {[key: string]: {[key: string]: {code_id: string}}};
  for (let i = 0; i < team_labels.length; i++) {
    const players_label = await hasura.get_players_label(contest_id, team_labels[i].label);
    console.log("players_label: ", players_label);
    if (!players_label) {
      return res.status(400).send("400 Bad Request: Players_label not found");
    }
    let team_codes = {} as {[key: string]: {code_id: string}};
    for (let j = 0; j < players_label.length; j++) {
      const code_id = await hasura.get_player_code(team_labels[i].team_id, players_label[j]);
      console.log("code_id: ", code_id);
      if (!code_id) {
        return res.status(400).send("400 Bad Request: Code_id not found");
      }
      team_codes[players_label[j]] = {code_id: code_id};
    }
    teams_codes[team_labels[i].team_id] = team_codes;
  }
  console.log("teams_codes: ", teams_codes);





});

/**
 * @param token
 * @param {uuid} contest_id
 * @param {uuid} room_id
 * @param {boolean} team_seq
 * @param {number} map
 * @param {number} exposed
 */

router.post("/", async (req, res) => {
  try {
    const contest_id = req.body.contest_id;
    const room_id = req.body.room_id;
    const team_seq = req.body.team_seq as boolean;
    const map = req.body.map as number;
    const exposed = req.body.exposed as number;
    const base_directory = await get_base_directory();
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
      const contest_name = await get_contest_name(contest_id);
      try {
          //查询选手是否在房间里
          const if_in_room = await client.request(
            gql`
              query query_if_in_room($room_id: uuid!, $user_uuid: uuid!) {
                contest_room_team(where: {_and: {room_id: {_eq: $room_id}, contest_team: {_or: [{team_leader_uuid: {_eq: $user_uuid}}, {contest_team_members: {user_uuid: {_eq: $user_uuid}}}]}}}) {
                  team_id
                }
              }
            `,
            {
              room_id: room_id,
              user_uuid: user_uuid
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
              await fs.mkdir(`${base_directory}/${contest_name}/arena/${room_id}`, {
                recursive: true,
                mode: 0o775,
              });
            } catch (err) {
              return res.status(400).send("文件存储目录创建失败");
            }

            docker_queue.push({
              contest_id: contest_id,
              room_id: room_id,
              team_id_1: team_withseq[0],
              team_id_2: team_withseq[1],
              map: map,
              arenic: 1,
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


export default router;
