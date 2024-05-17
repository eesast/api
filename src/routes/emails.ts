import express from "express";
import { gql } from "graphql-request";
import { sendEmail } from "../helpers/email";
import { newMentorApplicationTemplate } from "../helpers/htmlTemplates";
import hasura from "../middlewares/hasura";
import { client } from "..";

const router = express.Router();

router.post("/events", hasura, async (req, res) => {
  const data = req.body?.event?.data?.new;
  const table = req.body?.table?.name;
  const op = req.body?.event?.op;

  if (!data) {
    return res.status(500).end();
  }

  switch (table) {
    case "mentor_application": {
      try {
        const studentId = data.student_id;
        const mentorId = data.mentor_id;
        let response: any = await client.request(
          gql`
            query GetUserName($uuid: String!) {
              users(where: { uuid: { _eq: $uuid } }) {
                name
              }
            }
          `,
          {
            uuid: studentId,
          }
        );
        const studentName = response?.users[0]?.realname;
        if (!studentName) {
          return res.status(404).send("404 Not Found: Student does not exist");
        }

        response = await client.request(
          gql`
            query GetUserNameEmail($uuid: String!) {
              users(where: { uuid: { _eq: $uuid } }) {
                name
                email
              }
            }
          `,
          {
            uuid: mentorId,
          }
        );
        const mentorName = response?.users[0]?.realname;
        const mentorEmail = response?.users[0]?.email;
        if (!mentorName) {
          return res.status(404).send("404 Not Found: Teacher does not exist");
        }

        switch (op) {
          case "INSERT": {
            if (!mentorEmail) {
              return res
                .status(422)
                .send("422 Unprocessable Entity: Missing teacher email");
            }
            sendEmail(
              mentorEmail,
              `来自${studentName}同学的新生导师申请`,
              newMentorApplicationTemplate(
                mentorName,
                studentName,
                "https://eesast.com/info/mentor-applications"
              )
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
