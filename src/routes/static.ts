import express from "express";
import { JwtUserPayload } from "../middlewares/authenticate";
import getSTS from "../helpers/sts";
import { client } from "..";
import { gql } from "graphql-request";
import jwt from "jsonwebtoken";

const router = express.Router();
const generalActions = [
  "name/cos:PutObject",
  "name/cos:InitiateMultipartUpload",
  "name/cos:ListMultipartUploads",
  "name/cos:ListParts",
  "name/cos:UploadPart",
  "name/cos:CompleteMultipartUpload",
  "name/cos:AbortMultipartUpload",
  "name/cos:HeadObject",
  "name/cos:GetObject",
  "name/cos:DeleteObject",
  "name/cos:GetBucket",
];
const viewActions = [
  "name/cos:HeadObject",
  "name/cos:GetObject",
  "name/cos:GetBucket",
]
let user_uuid: string, role: string;

router.get("/*", async (req, res, next) => {
  try{
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      try{
        if (err || !decoded) {
          return res
            .status(401)
            .send("401 Unauthorized: Token expired or invalid");
        }
        const payload = decoded as JwtUserPayload;
        user_uuid = payload.uuid;
        role = payload.role;
        // admin gets all permissions, otherwise throw to next route.
        if (role == 'counselor' || role == 'root' || role == 'admin') {
          const sts = await getSTS(generalActions, "*");
          return res.status(200).send(sts);
        }
        else
          next('route');
      } catch (err) {
        return res.status(500).send(err);
      }
    });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/upload/*", async (req, res) => {
  try{
    const sts = await getSTS(viewActions, `upload/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/contest_upload/*", async (req, res) => {
  try{
    const sts = await getSTS(viewActions, `contest_upload/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/code/:contest_id/:team_id/*", async (req, res) => {
  try{
    if (role == 'student') {
      const contest_id = req.params.contest_id;
      const team_id = req.params.team_id;
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
      if (is_manager) {
        const sts = await getSTS(generalActions, `code/${contest_id}/${team_id}/*`);
        return res.status(200).send(sts);
      }
      else {
        const query_in_team = await client.request(
          gql`
            query query_if_in_team($team_id: uuid, $user_uuid: String, $contest_id: uuid) {
              contest_team(
                where: {
                  _and: [
                    { contest_id: { _eq: $contest_id } }
                    { team_id: { _eq: $team_id } }
                    {
                      _or: [
                        { team_leader_uuid: { _eq: $user_uuid } }
                        { contest_team_members: { user_uuid: { _eq: $user_uuid } } }
                      ]
                    }
                  ]
                }
              ) {
                team_id
              }
            }
          `,
          { 
            contest_id: contest_id, 
            team_id: team_id, 
            user_uuid: user_uuid 
          }
        );
        const is_in_team = query_in_team.contest_team.length != 0;
        if (!is_in_team) return res.status(401).send("当前用户不在队伍中");
        const sts = await getSTS(generalActions, `code/${contest_id}/${team_id}/*`);
        return res.status(200).send(sts);
      }
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/chat_record/:application_id/*", async (req, res) => {
  try{
    if (role == 'student' || role == 'teacher') {
      const application_id = req.params.application_id;
      const applications = await client.request(
        gql`
          query query_if_in_application($application_id: uuid) {
            mentor_application(where: {id: {_eq: $application_id}}) {
              mentor_uuid
              student_uuid
            }
          }
        `,
        { application_id: application_id }
      );
      if (applications.mentor_application.length == 0)
        return res.status(404).send("未查找到该申请");
      const application = applications.mentor_application[0];
      if ((role == 'student' && user_uuid == application.student_uuid) ||
          (role == 'teacher' && user_uuid == application.mentor_uuid)
        ) {
          const sts = await getSTS(generalActions, `chat_record/${application_id}/*`);
          return res.status(200).send(sts);
        }
      else {
        return res.status(401).send("当前用户没有该申请的权限");
      }
    }
    else {
      return res.status(401).send("401 Unauthorized");
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

export default router;
