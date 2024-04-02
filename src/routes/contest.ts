import express from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import { JwtUserPayload } from "../middlewares/authenticate";
import * as fs from 'fs';
import { get_contest_name } from "../helpers/hasura"
import { get_base_directory } from "../helpers/utils"

const router = express.Router();

export interface JwtServerPayload {
  contest_id: string;
  room_id: string;
  team_ids: string[];
}

interface ReqResult {
  team_id: number;
  score: number;
}

function cal(orgScore: number[], competitionScore: number[]) {
  // 调整顺序，让第一个元素成为获胜者，便于计算
  let reverse = false; // 记录是否需要调整
  if (competitionScore[0] < competitionScore[1]) {
    reverse = true;
  } else if (competitionScore[0] === competitionScore[1]) {
    if (orgScore[0] === orgScore[1]) {
      // 完全平局，不改变天梯分数
      return orgScore;
    }
    if (orgScore[0] > orgScore[1]) {
      // 本次游戏平局，但一方天梯分数高，另一方天梯分数低，需要将两者向中间略微靠拢，因此天梯分数低的定为获胜者
      reverse = true;
    }
  }
  if (reverse) {
    // 如果需要换，换两者的顺序
    competitionScore.reverse();
    orgScore.reverse();
  }
  const resScore = [0, 0];
  const deltaWeight = 1000.0; // 差距悬殊判断参数
  const delta = (orgScore[0] - orgScore[1]) / deltaWeight;
  // 盈利者天梯得分权值、落败者天梯得分权值
  const firstnerGet = 9e-6;
  const secondrGet = 5e-6;
  const deltaScore = 2100.0; // 两队竞争分差超过多少时就认为非常大
  const correctRate = (orgScore[0] - orgScore[1]) / (deltaWeight * 1.2); // 订正的幅度，该值越小，则在势均力敌时天梯分数改变越大
  const correct = 0.5 * (Math.tanh((competitionScore[0] - competitionScore[1] - deltaScore) / deltaScore - correctRate) + 1.0); // 一场比赛中，在双方势均力敌时，减小天梯分数的改变量
  resScore[0] = orgScore[0] + Math.round(competitionScore[0] * competitionScore[0] * firstnerGet * (1 - Math.tanh(delta)) * correct); // 胜者所加天梯分
  resScore[1] = orgScore[1] - Math.round(
    (competitionScore[0] - competitionScore[1]) * (competitionScore[0] - competitionScore[1]) * secondrGet * (1 - Math.tanh(delta)) * correct,
  ); // 败者所扣天梯分
  // 如果换过，再换回来
  if (reverse) {
    resScore.reverse();
  }
  return resScore;
}

function cal_contest(orgScore: number[], competitionScore: number[]) {
  if (competitionScore[0] > competitionScore[1]) {
    return [orgScore[0] + 1, orgScore[1]];
  }
  else if (competitionScore[0] < competitionScore[1]) {
    return [orgScore[0], orgScore[1] + 1];
  }
  else return [orgScore[0] + 0.5, orgScore[1] + 0.5];
}

/**
 * PUT update teams' score
 * @param token
 * @param {ReqResult[]} result
 * @param mode 0代表存在room的对战，1代表不存在room的对战
 */
router.put("/", async (req, res) => {
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
      if (req.body.mode != 0 && req.body.mode != 1) {
        return res.status(400).send("Wrong mode code!");
      }
      const payload = decoded as JwtServerPayload;
      if (req.body.mode == 0) {
        const query_if_valid = await client.request(
          gql`
            query query_if_valid($room_id: uuid, $team_id: [uuid!]) {
              contest_room_team(where: {_and: {room_id: {_eq: $room_id}, team_id: {_in: $team_id}}}) {
                team_id
              }
            }
          `,
          {
            room_id: payload.room_id,
            team_id: [payload.team_ids[0], payload.team_ids[1]]
          }
        );
        if (query_if_valid.contest_room_team.length != 2){
          return res.status(400).send("room-team mismatch or invalid");
        }
      }
      try {
        const current_score: number[] = [];
        const competitionScore: number[] = [];
        const team_name: string[] = [];
        const contest_times: number[] = [];
        for (let i = 0; i < 2; ++i) {
          switch (req.body.mode) {
            case 0: {
              const current_score_query0 = await client.request(
                gql`
                  query query_current_score($contest_id: uuid!, $team_id: uuid!) {
                    contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}) {
                      score
                      team_name
                    }
                  }
                `,
                {
                  team_id: payload.team_ids[i],
                  contest_id: payload.contest_id,
                }
              );
              if (current_score_query0.contest_team[0].score == null) {
                current_score[i] = 200;
              } else {
                current_score[i] = Number(current_score_query0.contest_team[0].score);
              }
              team_name[i] = current_score_query0.contest_team[0].team_name;
              break;
            }
            case 1: {
              const current_score_query1 = await client.request(
                gql`
                  query query_current_score($contest_id: uuid!, $team_id: uuid!) {
                    contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}) {
                      contest_score
                      status2
                    }
                  }
                `,
                {
                  team_id: payload.team_ids[i],
                  contest_id: payload.contest_id,
                }
              );
              if (current_score_query1.contest_team[0].contest_score == null) {
                current_score[i] = 200;
              } else {
                current_score[i] = Number(current_score_query1.contest_team[0].contest_score);
              }
              if (current_score_query1.contest_team[0].status2 == null) {
                contest_times[i] = 0;
              } else {
                contest_times[i] = Number(current_score_query1.contest_team[0].status2);
              }
              break;
            }
          }
        }
        const game_result = req.body.result as ReqResult[];
        game_result.forEach((value: ReqResult) => {
          competitionScore[value.team_id] = value.score;
        });
        const updated_score = req.body.mode == 0 ?
          cal([current_score[0], current_score[1]], [competitionScore[0], competitionScore[1]]) as number[] :
          cal_contest(current_score, competitionScore) as number[];
        for (let i = 0; i < 2; ++i) {
          switch (req.body.mode) {
            case 0: {
              await client.request(
                gql`
                  mutation update_score($contest_id: uuid!, $team_id: uuid!, $score: String) {
                    update_contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}, _set: {score: $score}) {
                      returning {
                        score
                      }
                    }
                  }
                `,
                {
                  team_id: payload.team_ids[i],
                  score: `${updated_score[i]}`,
                  contest_id: payload.contest_id,
                }
              );
              break;
            }
            case 1: {
              await client.request(
                gql`
                  mutation update_score($contest_id: uuid!, $team_id: uuid!, $score: String, $status2: String) {
                    update_contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}, _set: {contest_score: $score, status2: $status2}) {
                      returning {
                        contest_score
                      }
                    }
                  }
                `,
                {
                  team_id: payload.team_ids[i],
                  score: `${updated_score[i]}`,
                  status2: `${contest_times[i] + 1}`,
                  contest_id: payload.contest_id,
                }
              );
              break;
            }
          }
        }
        if (req.body.mode == 0) await client.request(
          gql`
            mutation update_room_status($contest_id: uuid!, $room_id: uuid!, $status: Boolean, $result: String) {
              update_contest_room(where: {_and: {contest_id: {_eq: $contest_id}, room_id: {_eq: $room_id}}}, _set: {status: $status, result: $result}) {
                returning {
                  status
                }
              }
            }
          `,
          {
            contest_id: payload.contest_id,
            room_id: payload.room_id,
            status: true,
            result: `${team_name[0]}: ${
              updated_score[0] - current_score[0] > 0 ? "+" : ""
            }${updated_score[0] - current_score[0]} , ${team_name[1]}: ${
              updated_score[1] - current_score[1] > 0 ? "+" : ""
              }${updated_score[1] - current_score[1]}`
          }
        );
        return res.status(200).send("update ok!");
      } catch (err) {
        return res.status(400).send(err);
      }
    });
  } catch (err) {
    return res.status(400).send(err);
  }
});







/**
 * POST launch contest
 * @param token
 * @param contest_id
 * @param mode 0代表单循环赛，1代表双循环赛，2代表测试比赛
 */
router.post("/", async (req, res) => {
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
      const payload = decoded as JwtUserPayload;
      const user_uuid = payload.uuid;
      const contest_id = req.body.contest_id;
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
        {
          contest_id: contest_id,
        }
      );
      const valid_team_ids = query_valid_teams.contest_team;

      const contest_name = await get_contest_name(contest_id);
      const base_directory = await get_base_directory();
      switch (req.body.mode) {
        case 0: {
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              docker_queue.push({
                contest_id: contest_id,
                room_id: `Num.${i}--vs--Num.${j}`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 0,
                arenic: 0,
                exposed: 0
              });
            }
          }
          break;
        }
        case 1: {
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              try {
                // 检查路径是否存在
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--oldmap`, fs.constants.F_OK);
                // 检查文件是否存在
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--oldmap/finish.lock`, fs.constants.R_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--oldmap/result.json`, fs.constants.R_OK);
                //若存在，则不再添加
              } catch (err) {
                // console.error('文件不存在', err);
                docker_queue.push({
                  contest_id: contest_id,
                  room_id: `Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--oldmap`,
                  team_id_1: valid_team_ids[i].team_id,
                  team_id_2: valid_team_ids[j].team_id,
                  map: 0,
                  arenic: 0,
                  exposed: 1
                });
              }
              try {
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--oldmap`, fs.constants.F_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--oldmap/finish.lock`, fs.constants.R_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--oldmap/result.json`, fs.constants.R_OK);
              } catch (err) {
                // console.error('文件不存在', err);
                docker_queue.push({
                  contest_id: contest_id,
                  room_id: `Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--oldmap`,
                  team_id_1: valid_team_ids[j].team_id,
                  team_id_2: valid_team_ids[i].team_id,
                  map: 0,
                  arenic: 0,
                  exposed: 1
                });
              }
            }
          }
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              try {
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--newmap`, fs.constants.F_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--newmap/finish.lock`, fs.constants.R_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--newmap/result.json`, fs.constants.R_OK);
              } catch (err) {
                // console.error('文件不存在', err);
                docker_queue.push({
                  contest_id: contest_id,
                  room_id: `Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--newmap`,
                  team_id_1: valid_team_ids[i].team_id,
                  team_id_2: valid_team_ids[j].team_id,
                  map: 1,
                  arenic: 0,
                  exposed: 1
                });
              }
              try {
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--newmap`, fs.constants.F_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--newmap/finish.lock`, fs.constants.R_OK);
                fs.accessSync(`${base_directory}/${contest_name}/competition/Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--newmap/result.json`, fs.constants.R_OK);
              } catch (err) {
                // console.error('文件不存在', err);
                docker_queue.push({
                  contest_id: contest_id,
                  room_id: `Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--newmap`,
                  team_id_1: valid_team_ids[j].team_id,
                  team_id_2: valid_team_ids[i].team_id,
                  map: 1,
                  arenic: 0,
                  exposed: 1
                });
              }

            }
          }
          break;
        }
        case 2: {
          for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
              docker_queue.push({
                contest_id: contest_id,
                room_id: `Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 0,
                arenic: 0,
                exposed: 1
              });
              docker_queue.push({
                contest_id: contest_id,
                room_id: `Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}`,
                team_id_1: valid_team_ids[j].team_id,
                team_id_2: valid_team_ids[i].team_id,
                map: 1,
                arenic: 0,
                exposed: 1
              });
            }
          }
          break;
        }
      }
      return res.status(200).send("Tournament started!");
    })
  }
  catch (err) {
    return res.status(400).send(err);
  }
});

export default router;
