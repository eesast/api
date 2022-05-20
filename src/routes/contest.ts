import express from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import { JwtPayload } from "../middlewares/authenticate";
import { erf, sqrt, round, log10 } from "mathjs";

const router = express.Router();

export interface JwtServerPayload {
  room_id: string;
  team_ids: string[];
}

interface ReqResult {
  team_id: number;
  score: number;
}

const PHI = (x: any) => {return erf(x / sqrt(2))};

// 天梯用算法
function calculateScore0(competitionScore: number[], orgScore: number[]) {
  let reverse = false;
  if (competitionScore[0] < competitionScore[1]) reverse = true;
  else if (competitionScore[0] == competitionScore[1]) {
    if (orgScore[0] == orgScore[1]) return orgScore;
    if (orgScore[0] > orgScore[1]) reverse = true;
    else reverse = false;
  }
  if (reverse) {
    [competitionScore[0], competitionScore[1]] = [competitionScore[1], competitionScore[0]];
    [orgScore[0], orgScore[1]] = [orgScore[1], orgScore[0]];
  }
  const resScore = [];
  const deltaWeight = 90.0;
  const delta = (orgScore[0] - orgScore[1]) / deltaWeight;
  const firstnerGet = 1e-4;
  const secondrGet = 7e-5;
  const possibleMaxScore = 1500.0;
  const deltaScore = 100.0;
  const correctRate = (orgScore[0] - orgScore[1]) / 100.0;
  const correct = 0.5 * (PHI((competitionScore[0] - competitionScore[1] - deltaScore) / deltaScore - correctRate) + 1.0);
  resScore.push(orgScore[0] + round(competitionScore[0] * competitionScore[0] * firstnerGet * (1 - PHI(delta)) * correct));
  if (competitionScore[1] < possibleMaxScore)
      resScore.push(orgScore[1] - round((possibleMaxScore - competitionScore[1]) * (possibleMaxScore - competitionScore[1]) * secondrGet * (1 - PHI(delta)) * correct));
  else
      resScore.push(orgScore[1]);
  if (reverse) {
    [resScore[0], resScore[1]] = [resScore[1], resScore[0]];
    [competitionScore[0], competitionScore[1]] = [competitionScore[1], competitionScore[0]];
    [orgScore[0], orgScore[1]] = [orgScore[1], orgScore[0]];
  }
  return resScore;
}

// 跑比赛用算法
const maxScore = 100;
function WinScore(delta: number, winnerGameScore: number) { // 根据游戏得分差值，与绝对分数，决定最后的加分
    const deltaRate = 0.035;
    const scoreRate = 2e-5;
    // 赢者至少加 half of maxScore，平局只加 a quarter of maxScore
    // 差值引入非线性，差值越大非线性贡献的分数越多；绝对分数只用线性
    const score = maxScore / 2 + (deltaRate + log10(delta) / maxScore + winnerGameScore * scoreRate) * delta;
    return score < maxScore ? score : maxScore;
}

function calculateScore1(competitionScore: number[], orgScore: number[]) {
    let reverse = false;
    if (competitionScore[0] < competitionScore[1]) reverse = true;
    else if (competitionScore[0] == competitionScore[1]) { // 平局，两边加quarter of maxScore
        orgScore[0] += maxScore / 4;
        orgScore[1] += maxScore / 4;
        return orgScore;
    }
    if (reverse) {   // 如果需要换，换两者的顺序
      [competitionScore[0], competitionScore[1]] = [competitionScore[1], competitionScore[0]];
      [orgScore[0], orgScore[1]] = [orgScore[1], orgScore[0]];
    }
    const resScore = [];
    const delta = competitionScore[0] - competitionScore[1];
    const addScore = WinScore(delta, competitionScore[0]);
    resScore.push(orgScore[0] + addScore);
    resScore.push(orgScore[1]);
    if (reverse) {
      [resScore[0], resScore[1]] = [resScore[1], resScore[0]];
      [competitionScore[0], competitionScore[1]] = [competitionScore[1], competitionScore[0]];
      [orgScore[0], orgScore[1]] = [orgScore[1], orgScore[0]];
    }
    return resScore;
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
      if (req.body.mode != 0 && req.body.mode != 1) return res.status(400).send("Wrong mode code!");
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
                  contest_id: process.env.GAME_ID
                }
              );
              if (current_score_query0.contest_team[0].score == null) current_score[i] = 200;
              else current_score[i] = Number(current_score_query0.contest_team[0].score);
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
                  contest_id: process.env.GAME_ID
                }
              );
              if (current_score_query1.contest_team[0].contest_score == null) current_score[i] = 200;
              else current_score[i] = Number(current_score_query1.contest_team[0].contest_score);
              if (current_score_query1.contest_team[0].status2 == null) contest_times[i] = 0;
              else contest_times[i] = Number(current_score_query1.contest_team[0].status2);
              break;
            }
          }
        }
        const game_result = req.body.result as ReqResult[];
        game_result.forEach((value: ReqResult) => {
          competitionScore[value.team_id] = value.score;
        });
        const updated_score = req.body.mode == 0 ? calculateScore0(competitionScore, current_score) as number[] : calculateScore1(competitionScore, current_score) as number[];
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
                  contest_id: process.env.GAME_ID
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
                  contest_id: process.env.GAME_ID
                }
              );
              break;
            }
          }
        }
        if (req.body.mode == 0) await client.request(   //存在room
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
            contest_id: process.env.GAME_ID,
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
 * @param mode 0代表单循环赛，1代表双循环赛，2代表测试比赛
 */
router.post("/", async (req, res) => {
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
      switch (req.body.mode) {
        case 0: {
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              docker_queue.push({
                room_id: `Num.${i}--vs--Num.${j}`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 0,
                mode: 1
              });
            }
          }
          break;
        }
        case 1: {
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              docker_queue.push({
                room_id: `Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--oldmap`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 0,
                mode: 1
              });
              docker_queue.push({
                room_id: `Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--oldmap`,
                team_id_1: valid_team_ids[j].team_id,
                team_id_2: valid_team_ids[i].team_id,
                map: 0,
                mode: 1
              });
            }
          }
          for (let i = 0; i < valid_team_ids.length; i++) {
            for (let j = i + 1; j < valid_team_ids.length; j++) {
              docker_queue.push({
                room_id: `Team_${valid_team_ids[i].team_id}--vs--Team_${valid_team_ids[j].team_id}--newmap`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 1,
                mode: 1
              });
              docker_queue.push({
                room_id: `Team_${valid_team_ids[j].team_id}--vs--Team_${valid_team_ids[i].team_id}--newmap`,
                team_id_1: valid_team_ids[j].team_id,
                team_id_2: valid_team_ids[i].team_id,
                map: 1,
                mode: 1
              });
            }
          }
          break;
        }
        case 2: {
          for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
              docker_queue.push({
                room_id: `Num.${i}--vs--Num.${j}`,
                team_id_1: valid_team_ids[i].team_id,
                team_id_2: valid_team_ids[j].team_id,
                map: 1,
                mode: 1
              });
              docker_queue.push({
                room_id: `Num.${j}--vs--Num.${i}`,
                team_id_1: valid_team_ids[j].team_id,
                team_id_2: valid_team_ids[i].team_id,
                map: 1,
                mode: 1
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
