import express from "express";
import fetch from "node-fetch";
import { sendEmail } from "../helpers/email";
import { newMentorApplicationTemplate } from "../helpers/htmlTemplates";
import hasura from "../middlewares/hasura";

const router = express.Router();

router.post("/", hasura, async (req, res) => {
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
        let response = await fetch(`${process.env.HASURA_URL}/v1/graphql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
          },
          body: JSON.stringify({
            query: `
          query GetUserName($_id: String!) {
            user(where: {_id: {_eq: $_id}}) {
              name
            }
          }
          `,
            variables: {
              _id: studentId,
            },
          }),
        });
        let json = await response.json();
        const studentName = json?.data?.user[0]?.name;
        if (!studentName) {
          return res.status(404).send("404 Not Found: Student does not exist");
        }

        response = await fetch(`${process.env.HASURA_URL}/v1/graphql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET!,
          },
          body: JSON.stringify({
            query: `
          query GetUserNameEmail($_id: String!) {
            user(where: {_id: {_eq: $_id}}) {
              name
              email
            }
          }
          `,
            variables: {
              _id: mentorId,
            },
          }),
        });
        json = await response.json();
        const mentorName = json?.data?.user[0]?.name;
        const mentorEmail = json?.data?.user[0]?.email;
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
        break;
      } catch (e) {
        console.error(e);
        res.status(500).end();
      }
    }
  }
  return res.status(500).end();
});

export default router;
