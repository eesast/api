import express from "express";
import authenticate from "../middlewares/authenticate";
import getSTS from "../helpers/sts";
import { client } from "..";
import { gql } from "graphql-request";

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

router.get("/*",authenticate(), async (req, res, next) => {
  try{
    user_uuid = req.auth.user.uuid;
    role = req.auth.user.role;
    // admin gets all permissions, otherwise throw to next route.
    if (role == 'admin') {
      const sts = await getSTS(generalActions, "*");
      return res.status(200).send(sts);                   //返回sts密钥
    }
    else
      next('route');
  } catch (err) {
    return res.status(500).send(err);
  }
});

//info
router.get("/upload/*", async (req, res) => {
  try{
    const sts = await getSTS(role === "counselor" ? generalActions : viewActions, `upload/*`);
    return res.status(200).send(sts);
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
    else if (role === "counselor") {
      const sts = await getSTS(generalActions, `chat_record/*`);
      return res.status(200).send(sts);
    }
    else {
      return res.status(401).send("401 Unauthorized");
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

//contest
const checkContestManager = async (name: string) => {
  const query_if_manager = await client.request(
    gql`
      query query_is_manager($name: String, $user_uuid: uuid) {
        contest_manager(where: {_and: {contest: {name: {_eq: $name}}, user_uuid: {_eq: $user_uuid}}}) {
          user_uuid
        }
      }
    `,
    {
      name: name,
      user_uuid: user_uuid
    }
  );
  return query_if_manager.contest_manager.length != 0;
};
const checkTeamMember = async (name: string, team_id: string) => {
  const query_in_team = await client.request(
    gql`
      query query_if_in_team($team_id: uuid, $user_uuid: uuid, $name: String) {
        contest_team(
          where: {
            _and: [
              { contest: {name: {_eq: $name}} }
              { team_id: { _eq: $team_id } }
              { contest_team_members: { user_uuid: { _eq: $user_uuid } } }
            ]
          }
        ) {
          team_id
        }
      }
    `,
    {
      name: name,
      team_id: team_id,
      user_uuid: user_uuid
    }
  );
  return query_in_team.contest_team.length != 0;
};

//首先检验比赛管理员权限
router.get("/:name/*", async (req, res, next) => {
  try{
    const name = req.params.name;
    if (await checkContestManager(name)) {
      const sts = await getSTS(generalActions, `${name}/*`);
      return res.status(200).send(sts);
    }
    else {
      next('route');
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/:name/code/:team_id/*", async (req, res) => {
  try{
    const name = req.params.name;
    const team_id = req.params.team_id;
    if (!await checkTeamMember(name, team_id)) return res.status(401).send("当前用户不在队伍中");
    const sts = await getSTS(generalActions, `${name}/code/${team_id}/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/:name/notice/*", async (req, res) => {
  try{
    const name = req.params.name;
    const sts = await getSTS(viewActions, `${name}/notice/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/:name/competition/*", async (req, res) => {
  try{
    const name = req.params.name;
    const sts = await getSTS(viewActions, `${name}/competition/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/:name/map/*", async (req, res) => {
  try{
    const name = req.params.name;
    const sts = await getSTS(viewActions, `${name}/map/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/:name/arena/*", async (req, res) => {
  try{
    const name = req.params.name;
    const sts = await getSTS(viewActions, `${name}/arena/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/public/WebGL/:name", async (req, res, next) => {
  try{
    const name = req.params.name;
    if (await checkContestManager(name)) {
      const sts = await getSTS(generalActions, `public/WebGL/${name}/*`);
      return res.status(200).send(sts);
    }
    else {
      next('route');
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.get("/public/*", async (req, res) => {
  try{
    const sts = await getSTS(viewActions, `public/*`);
    return res.status(200).send(sts);
  } catch (err) {
    return res.status(500).send(err);
  }
});

export default router;
