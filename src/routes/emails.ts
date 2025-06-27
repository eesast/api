import express from "express";
import { gql } from "graphql-request";
import { sendEmail } from "../helpers/email";
import {
  newMentorApplicationTemplate,
  updateMentorApplicationTemplate,
  newMentorApplicationTalkTemplate,
  updateMentorApplicationTalkTemplate,
} from "../helpers/htmlTemplates";
import authenticate from "../middlewares/authenticate";
import { client } from "..";

const router = express.Router();

router.post("/events", authenticate(), async (req, res) => {
  const data = req.body.data;
  const table = req.body.table;
  const op = req.body.op;
  const uuid = req.auth.user.uuid;

  if (!data) {
    return res.status(400).send("400 Bad Request: Missing data").end();
  }

  switch (table) {
    case "mentor_application": {
      try {
        const studentId: string = data.student_uuid;
        const mentorId: string = data.mentor_uuid;
        let response: any = await client.request(
          gql`
            query GetUserNameEmail($uuid: String!) {
              users(where: { uuid: { _eq: $uuid } }) {
                realname
                email
              }
            }
          `,
          {
            uuid: studentId,
          },
        );
        const studentName = response?.users[0]?.realname;
        const studentEmail = response?.users[0]?.email;
        if (!studentName) {
          return res.status(404).send("404 Not Found: Student does not exist");
        }

        response = await client.request(
          gql`
            query GetUserNameEmail($uuid: String!) {
              users(where: { uuid: { _eq: $uuid } }) {
                realname
                email
              }
            }
          `,
          {
            uuid: mentorId,
          },
        );
        const mentorName = response?.users[0]?.realname;
        const mentorEmail = response?.users[0]?.email;
        if (!mentorName) {
          return res.status(404).send("404 Not Found: Teacher does not exist");
        }

        switch (op) {
          case "insert": {
            if (!mentorEmail) {
              return res
                .status(422)
                .send("422 Unprocessable Entity: Missing teacher email");
            }
            if (uuid !== studentId) {
              return res
                .status(403)
                .send("403 Forbidden: You can only send email to your mentor");
            }
            sendEmail(
              mentorEmail,
              `来自${studentName}同学的新生导师申请`,
              newMentorApplicationTemplate(
                mentorName,
                studentName,
                "https://eesast.com/#/info/mentor-applications",
              ),
            );
            break;
          }
          case "update": {
            if (!studentEmail) {
              return res
                .status(422)
                .send("422 Unprocessable Entity: Missing teacher email");
            }
            if (uuid !== mentorId) {
              return res
                .status(403)
                .send("403 Forbidden: You can only send email to your mentee");
            }
            sendEmail(
              studentEmail,
              `来自${mentorName}老师的新生导师申请更新`,
              updateMentorApplicationTemplate(
                mentorName,
                studentName,
                "https://eesast.com/#/info/mentor-applications",
              ),
            );
            break;
          }
          case "add_talk": {
            if (!mentorEmail) {
              return res
                .status(422)
                .send("422 Unprocessable Entity: Missing teacher email");
            }
            if (uuid !== studentId) {
              return res
                .status(403)
                .send("403 Forbidden: You can only send email to your mentor");
            }
            sendEmail(
              mentorEmail,
              `来自${studentName}同学的新生导师谈话记录`,
              newMentorApplicationTalkTemplate(
                mentorName,
                studentName,
                "https://eesast.com/#/info/mentor-applications",
              ),
            );
            break;
          }
          case "update_talk": {
            if (!studentEmail) {
              return res
                .status(422)
                .send("422 Unprocessable Entity: Missing teacher email");
            }
            if (uuid !== mentorId) {
              return res
                .status(403)
                .send("403 Forbidden: You can only send email to your mentee");
            }
            sendEmail(
              studentEmail,
              `来自${mentorName}老师的新生导师谈话记录确认`,
              updateMentorApplicationTalkTemplate(
                mentorName,
                studentName,
                "https://eesast.com/#/info/mentor-applications",
              ),
            );
            break;
          }
        }

        return res.status(200).end();
      } catch (e) {
        console.error(e);
        res.status(500).end();
      }
    }
  }
  return res.status(500).end();
});

export default router;
