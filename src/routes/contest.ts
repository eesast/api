import express from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";
import Docker from "dockerode";

const router = express.Router();

export interface JwtServerPayload {
  room_id: string;
  teams: {
    team_alias: number;
    team_id: string;
  }[];
}

interface ReqResult {
  team_id: number;
  score: number;
}

function calculateScore(current_score: number[], increment: number[]) {
  // \xfgg/
  let reverse = false;
  if (increment[0] < increment[1]) reverse = true;
  else if (increment[0] == increment[1]) {
    if (current_score[0] == current_score[1]) return current_score;
    if (current_score[0] > current_score[1]) reverse = true;
    else reverse = false;
  }
  if (reverse) {
    current_score.reverse();
    increment.reverse();
  }
  const resScore = [0, 0];
  const deltaWeight = 80;
  const delta = (current_score[0] - current_score[1]) / deltaWeight;

  const firstnerGet = 8e-5;
  const secondrGet = 5e-6;

  const deltaScore = 100.0; // 两队竞争分差超过多少时就认为非常大
  const correctRate = (current_score[0] - current_score[1]) / 100; // 订正的幅度，值越小，势均力敌时改变越大
  const correct =
    0.5 *
    (Math.tanh(
      (increment[0] - increment[1] - deltaScore) / deltaScore - correctRate
    ) +
      1.0);

  resScore[0] =
    current_score[0] +
    Math.round(
      increment[0] *
        increment[0] *
        firstnerGet *
        (1 - Math.tanh(delta)) *
        correct
    );
  resScore[1] =
    current_score[1] -
    Math.round(
      (2500.0 - increment[1]) *
        (2500.0 - increment[1]) *
        secondrGet *
        (1 - Math.tanh(delta)) *
        correct
    );

  if (reverse) resScore.reverse();
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
          query query_if_valid($_eq: uuid, $_in: [uuid!]) {
            thuai_room_team(
              where: { room_id: { _eq: $_eq }, thuai_team_id: { _in: $_in } }
            ) {
              room_id
            }
          }
        `,
        {
          _eq: payload.room_id,
          _in: [payload.teams[0].team_id, payload.teams[1].team_id],
        }
      );
      if (query_if_valid.thuai_room_team.length != 2)
        return res.status(400).send("room-team invalid");
      else {
        try {
          const team_id: string[] = [];
          const current_score: number[] = [];
          const increment: number[] = [];
          const team_name: string[] = [];
          payload.teams.forEach(
            (value: { team_alias: number; team_id: string }) => {
              team_id[value.team_alias] = value.team_id;
            }
          );
          for (let i = 0; i < 2; ++i) {
            const current_score_query = await client.request(
              gql`
                query query_current_score($team_id: uuid!) {
                  thuai_by_pk(team_id: $team_id) {
                    score
                    team_name
                  }
                }
              `,
              {
                team_id: team_id[i],
              }
            );
            current_score[i] = current_score_query.thuai_by_pk.score;
            team_name[i] = current_score_query.thuai_by_pk.team_name;
          }

          const game_result = req.body.result as ReqResult[];
          game_result.forEach((value: ReqResult) => {
            increment[value.team_id] = value.score;
          });
          console.log(`original_score:${current_score}`);
          console.log(`increment:${increment}`);
          const updated_score = calculateScore(
            current_score,
            increment
          ) as number[];
          console.log(`updated_score:${updated_score}`);

          for (let i = 0; i < 2; ++i) {
            await client.request(
              gql`
                mutation update_score($team_id: uuid!, $score: Int = 0) {
                  update_thuai_by_pk(
                    pk_columns: { team_id: $team_id }
                    _set: { score: $score }
                  ) {
                    team_id
                    score
                  }
                }
              `,
              {
                team_id: team_id[i],
                score: updated_score[i],
              }
            );
          }
          await client.request(
            gql`
              mutation update_room_status(
                $room_id: uuid!
                $status: Boolean
                $result: String
              ) {
                update_thuai_room_by_pk(
                  pk_columns: { room_id: $room_id }
                  _set: { status: $status, result: $result }
                ) {
                  status
                }
              }
            `,
            {
              room_id: payload.room_id,
              status: true,
              result: `${team_name[0]}: ${
                updated_score[0] - current_score[0] > 0 ? "+" : ""
              }${updated_score[0] - current_score[0]} , ${team_name[1]}: ${
                updated_score[1] - current_score[1] > 0 ? "+" : ""
              }${updated_score[1] - current_score[1]}`,
            }
          );
          const docker =
            process.env.DOCKER === "remote"
              ? new Docker({
                  host: process.env.DOCKER_URL,
                  port: process.env.DOCKER_PORT,
                })
              : new Docker();
          const room_network = docker.getNetwork(
            `THUAI4_room_${payload.room_id}`
          );
          await room_network.remove();
          return res.status(200).send("update ok!");
        } catch (err) {
          return res.status(400).send(err);
        }
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send(err);
  }
});

export default router;
