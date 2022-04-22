import express from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";
import {erf, sqrt, round} from "mathjs";

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

function calculateScore(competitionScore: number[], orgScore: number[]) {
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
      resScore.push(orgScore[1] - round((1000.0 - competitionScore[1]) * (1000.0 - competitionScore[1]) * secondrGet * (1 - PHI(delta)) * correct));
  else
      resScore.push(orgScore[1]);
  if (reverse) [resScore[0], resScore[1]] = [resScore[1], resScore[0]];
  return resScore;
}

/**
 * PUT update teams' score
 * @param token
 * @param {ReqResult[]} result
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

      const payload = decoded as JwtServerPayload;

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
        console.log("room-team mismatch or invalid");
        return res.status(400).send("room-team mismatch or invalid");
      }
      else {
        try {
          const current_score: number[] = [];
          const increment: number[] = [];
          const team_name: string[] = [];
          for (let i = 0; i < 2; ++i) {
            const current_score_query = await client.request(
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
            current_score[i] = current_score_query.contest_team[0].score;
            team_name[i] = current_score_query.contest_team[0].team_name;
            if (current_score[i] == null) current_score[i] = 200;
          }
          const game_result = req.body.result as ReqResult[];
          game_result.forEach((value: ReqResult) => {
            increment[value.team_id] = value.score;
          });
          const updated_score = calculateScore(
            increment,
            current_score
          ) as number[];
          for (let i = 0; i < 2; ++i) {
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
                score: String(updated_score[i]),
                contest_id: process.env.GAME_ID
              }
            );
          }
          await client.request(
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
      }
    });
  } catch (err) {
    return res.status(400).send(err);
  }
});

export default router;
