import express from "express";
import authenticate, { JwtPayload } from "../middlewares/authenticate";
import getSTS from "../helpers/sts";
import { client } from "..";
import { gql } from "graphql-request";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/", authenticate(["counselor", "root"]), async (req, res) => {
  try{
    const action = [
      "name/cos:PutObject",
      "name/cos:InitiateMultipartUpload",
      "name/cos:ListMultipartUploads",
      "name/cos:ListParts",
      "name/cos:UploadPart",
      "name/cos:CompleteMultipartUpload",
      "name/cos:AbortMultipartUpload",
      "name/cos:GetObject",
      "name/cos:DeleteObject",
    ];
    const sts = await getSTS(action, "*");
    return res.status(200).send(sts);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});



// 用户具有的权限:"name/cos:PutObject","name/cos:InitiateMultipartUpload","name/cos:ListMultipartUploads","name/cos:ListParts","name/cos:UploadPart","name/cos:CompleteMultipartUpload","name/cos:AbortMultipartUpload","name/cos:GetObject","name/cos:DeleteObject",
// 可访问的目录为/THUAI6/{team_id}/\*
/**
 * GET compile code of team_id
 * @param token (user_id)
 * @param {uuid} req.query.team_id
 */
router.get("/player", async (req, res) => {
  const team_id = req.query.team_id;
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
    const is_manager = query_if_manager.contest_manager.length != 0;
    if (!is_manager) {
      try {
        const query_in_team = await client.request(
          gql`
            query query_if_in_team($team_id: uuid, $user_id: String, $contest_id: uuid) {
              contest_team(
                where: {
                  _and: [
                    { contest_id: { _eq: $contest_id } }
                    { team_id: { _eq: $team_id } }
                    {
                      _or: [
                        { team_leader: { _eq: $user_id } }
                        { contest_team_members: { user_id: { _eq: $user_id } } }
                      ]
                    }
                  ]
                }
              ) {
                team_id
              }
            }
          `,
          { contest_id: process.env.GAME_ID, team_id: team_id, user_id: user_id }
        );
        const is_in_team = query_in_team.contest_team.length != 0;
        if (!is_in_team) return res.status(401).send("当前用户不在队伍中");
      } catch (err) {
        return res.status(400).send(err);
      }
    }
    try {
      const action = [
        "name/cos:PutObject",
        "name/cos:InitiateMultipartUpload",
        "name/cos:ListMultipartUploads",
        "name/cos:ListParts",
        "name/cos:UploadPart",
        "name/cos:CompleteMultipartUpload",
        "name/cos:AbortMultipartUpload",
        "name/cos:GetObject",
        "name/cos:DeleteObject",
      ];
      // console.log(req.query.team_id)
      const sts = await getSTS(action, `THUAI6/${req.query.team_id}/*`);
      return res.status(200).send(sts);
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
  });
});

export default router;
