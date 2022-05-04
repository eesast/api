import cron from "node-cron";
import { docker_queue } from "..";
import Docker from "dockerode";
import jwt from "jsonwebtoken";
import { JwtServerPayload } from "../routes/contest";
import { gql } from "graphql-request";
import { client } from "..";

export interface queue_element {
  room_id: string;
  team_id_1: string;
  team_id_2: string;
  map: number;
  mode: number;
}

const base_directory = process.env.NODE_ENV === "production" ? '/data/thuai5/' : '/mnt/d/软件部/thuai5/';

const docker_cron = () => {
  cron.schedule(`*/${process.env.QUEUE_CHECK_TIME} * * * * *`, async () => {
    const max_container_num = parseInt(process.env.MAX_CONTAINERS as string);
    const docker =
      process.env.DOCKER === "remote"
        ? new Docker({
            host: process.env.DOCKER_URL,
            port: process.env.DOCKER_PORT,
          })
        : new Docker();
    try {
      const existing_containers = await docker.listContainers({
        all: true,
      });
      if (existing_containers.length > max_container_num) return;
      else {
        const available_num = Math.min(
          (max_container_num - existing_containers.length),
          docker_queue.length
        );
        if (available_num === 0) return;
        for (let i = 0; i < available_num; ++i) {
          const queue_front = docker_queue.shift() as queue_element;
          try {
            const query_if_compiled = await client.request(
              gql`
                query query_if_compiled($contest_id: uuid!, $team_id: [uuid!]) {
                  contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_in: $team_id}}}) {
                    status
                  }
                }
              `,
              {
                contest_id: process.env.GAME_ID,
                team_id: [queue_front.team_id_1, queue_front.team_id_2]
              }
            );
            let all_compiled = true;
            query_if_compiled.contest_team.forEach((element: { status: string }) => {
              if (element.status != "compiled") all_compiled = false;
            });
            if (!all_compiled) continue;

          } catch (err) {
            console.log(err);
            continue;
          }
          let containerRunning = false;
          const containerList = await docker.listContainers();
          containerList.forEach((containerInfo) => {
            if (
              containerInfo.Names.includes(
                `/THUAI5_runner_${queue_front?.room_id}`
              )
            ) {
              containerRunning = true;
            }
          });
          if (!containerRunning) {
            try {
              const serverToken = jwt.sign(
                {
                  room_id: queue_front.room_id,
                  team_ids: [queue_front.team_id_1, queue_front.team_id_2]
                } as JwtServerPayload,
                process.env.SECRET!,
                {
                  expiresIn: "30m",
                }
              );
              const url =
                process.env.NODE_ENV == "production"
                  ? "https://api.eesast.com/contest"
                  : "http://172.17.0.1:28888/contest";
              const container_runner = await docker.createContainer({
                Image: process.env.RUNNER_IMAGE,
                AttachStdin: false,
                AttachStdout: false,
                AttachStderr: false,
                name: `THUAI5_runner_${queue_front.room_id}`,
                HostConfig: {
                  Binds: [
                    `${base_directory}/playback/${queue_front.room_id}/:/usr/local/playback`,
                    `${base_directory}/map/:/usr/local/map`,
                    `${base_directory}/${queue_front.team_id_1}/:/usr/local/team1`,
                    `${base_directory}/${queue_front.team_id_2}/:/usr/local/team2`
                  ],
                  AutoRemove: true,
                },
                Env: [
                  `URL=${url}`,
                  `TOKEN=${serverToken}`,
                  `MODE=${queue_front.mode}`,
                  `MAP=${queue_front.map == 0 ? "oldmap.txt" : "newmap.txt"}`
                ],
                Cmd: ["-m 6g"]
              });
              await container_runner.start();
              console.log("runnner started");
            } catch (err) {
              console.log(err);
              continue;
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
};

export default docker_cron;
