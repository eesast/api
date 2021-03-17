import express from "express";
import Docker from "dockerode";
import { gql } from "graphql-request";
import { client } from "..";
//import shell from "child_process";

const router = express.Router();

/**
 * @param token (user_id)
 * @param {uuid} room_id
 */
//network, server, client, run shell to clear network
router.post("/", async (req, res) => {
  const room_id = req.body.room_id;
  const docker =
    process.env.DOCKER === "remote"
      ? new Docker({
          host: process.env.DOCKER_URL,
          port: process.env.DOCKER_PORT,
        })
      : new Docker();
  try {
    const query_teams = await client.request(
      gql`
        query MyQuery($_eq: uuid!) {
          thuai_room_team_aggregate(where: { room_id: { _eq: $_eq } }) {
            nodes {
              thuai_team_id
            }
          }
        }
      `,
      {
        _eq: room_id,
      }
    );
    const teams = query_teams.thuai_room_team_aggregate.nodes;
    if (teams.length != 2) {
      res.status(400).send("team unsufficient!");
    }
    try {
      await docker.createNetwork({
        Name: `THUAI4_room_${room_id}`,
      });
    } catch (err) {
      return res.status(400).send("can't create network");
    }

    try {
      const container_server = await docker.createContainer({
        Image: process.env.SERVERIMAGE,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        name: `THUAI4_room_server_${room_id}`,
        HostConfig: {
          NetworkMode: `THUAI4_room_${room_id}`,
          AutoRemove: true,
        },
        StopTimeout: parseInt(process.env.MAX_DOCKER_TIMEOUT as string),
        Cmd: [""],
      });
      await container_server.start();
    } catch (err) {
      return res.status(400).send(`can't create server ${room_id}`);
    }

    for (let ii = 0; ii < 2; ++ii) {
      try {
        const container_client = await docker.createContainer({
          Image: "eesast/thuai_client",
          AttachStdin: false,
          AttachStdout: false,
          AttachStderr: false,
          name: `THUAI4_room_client${ii}_${room_id}`,
          HostConfig: {
            NetworkMode: `THUAI4_room_${room_id}`,
            AutoRemove: true,
          },
          StopTimeout: parseInt(process.env.MAX_DOCKER_TIMEOUT as string),
          Cmd: [""],
        });
        await container_client.start();
      } catch (err) {
        return res.status(400).send(`can't create client${ii} ${room_id}`);
      }
    }
  } catch (err) {
    return res.status(400).send(err);
  }
});

//router.delete("/", async (req, res) => {});

export default router;
