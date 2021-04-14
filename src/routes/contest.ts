import express from "express";
import jwt from "jsonwebtoken";
import { gql } from "graphql-request";
import { client } from "..";

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
  increment.forEach((value: number, index: number) => {
    current_score[index] += value;
  });
  return current_score;
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
          query MyQuery($_eq: uuid, $_in: [uuid!]) {
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
          payload.teams.forEach(
            (value: { team_alias: number; team_id: string }) => {
              team_id[value.team_alias] = value.team_id;
            }
          );
          for (let i = 0; i < 2; ++i) {
            const current_score_query = await client.request(
              gql`
                query MyQuery($team_id: uuid!) {
                  thuai_by_pk(team_id: $team_id) {
                    score
                  }
                }
              `,
              {
                team_id: team_id[i],
              }
            );
            current_score[i] = current_score_query.thuai_by_pk.score;
          }

          const game_result = req.body.result as ReqResult[];
          game_result.forEach((value: ReqResult) => {
            increment[value.team_id] = value.score;
          });

          const updated_score = calculateScore(current_score, increment);

          for (let i = 0; i < 2; ++i) {
            await client.request(
              gql`
                mutation MyMutation($team_id: uuid!, $score: Int = 0) {
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
