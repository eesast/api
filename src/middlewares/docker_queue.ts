import cron from "node-cron";
import { docker_queue } from "..";
import Docker from "dockerode";
import jwt from "jsonwebtoken";
import { JwtServerPayload } from "../routes/contest";

export interface queue_element {
  room_id: string;
  team_id_1: string;
  team_id_2: string;
}

const docker_cron = () => {
  // cron.schedule("*/10 * * * * *", async () => {
  //   const docker =
  //     process.env.DOCKER === "remote"
  //       ? new Docker({
  //           host: process.env.DOCKER_URL,
  //           port: process.env.DOCKER_PORT,
  //         })
  //       : new Docker();
  //   await docker.pruneNetworks({
  //     filters:'{"until":"5m"}'
  //   });
  // });
  // 上面这个本来打算实现自动删除一定时间的network的，但是不知为何 filter 怎么也用不好，所以目前只能使用 crontab 来做。求大佬来帮忙想办法orz
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
          (max_container_num - existing_containers.length) / 2,
          docker_queue.length
        );
        console.log("队列容量:", max_container_num);
        console.log("等待:", available_num);
        if (available_num === 0) return;
        for (let i = 0; i < available_num; ++i) {
          const queue_front = docker_queue.shift() as queue_element;
          try {
            const existing_networks = await docker.listNetworks();
            if (
              !existing_networks.filter(
                (elem) => elem.Name === `THUAI4_room_${queue_front.room_id}`
              ).length
            ) {
              await docker.createNetwork({
                Name: `THUAI4_room_${queue_front.room_id}`,
              });
            }
          } catch (err) {
            console.log(err);
            continue;
          }
          let containerRunning = false;
          const containerList = await docker.listContainers();
          containerList.forEach((containerInfo) => {
            if (
              containerInfo.Names.includes(
                `/THUAI4_room_server_${queue_front?.room_id}`
              ) ||
              containerInfo.Names.includes(
                `/THUAI4_room_client_${queue_front?.room_id}`
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
                  teams: [
                    {
                      team_alias: 0,
                      team_id: queue_front.team_id_1,
                    },
                    {
                      team_alias: 1,
                      team_id: queue_front.team_id_2,
                    },
                  ],
                } as JwtServerPayload,
                process.env.SECRET!,
                {
                  expiresIn: "10m",
                }
              );
              const container_server = await docker.createContainer({
                Image: process.env.SERVER_IMAGE,
                Tty: true,
                AttachStdin: false,
                AttachStdout: false,
                AttachStderr: false,
                name: `THUAI4_room_server_${queue_front.room_id}`,
                HostConfig: {
                  NetworkMode: `THUAI4_room_${queue_front.room_id}`,
                  Binds: [
                    `/data/thuai4_playback/${queue_front.room_id}/:/usr/local/mnt`,
                  ],
                  AutoRemove: true,
                },
                Cmd: [
                  process.env.MAX_SERVER_TIMEOUT as string,
                  "2",
                  "4",
                  `${serverToken}`,
                ],
              });
              await container_server.start();
            } catch (err) {
              console.log(err);
              continue;
            }

            const network = docker.getNetwork(
              `THUAI4_room_${queue_front.room_id}`
            );
            const netInfo = (await network.inspect()) as Docker.NetworkInspectInfo;
            const roomIp = Object.values(
              netInfo.Containers!
            )[0].IPv4Address.split("/")[0];

            try {
              const container_client = await docker.createContainer({
                Image: process.env.AGENTCLIENT_IMAGE,
                AttachStdin: false,
                AttachStdout: false,
                AttachStderr: false,
                name: `THUAI4_room_client_${queue_front.room_id}`,
                HostConfig: {
                  NetworkMode: `THUAI4_room_${queue_front.room_id}`,
                  AutoRemove: true,
                  Binds: [
                    `/data/thuai4/${queue_front.team_id_1}/player:/usr/local/mnt/player1`,
                    `/data/thuai4/${queue_front.team_id_2}/player:/usr/local/mnt/player2`,
                  ],
                },
                Cmd: [`${roomIp}`, process.env.MAX_CLIENT_TIMEOUT as string],
              });
              await container_client.start();
            } catch (err) {
              console.log(err);
              continue;
            }

            console.log("all ok");
          } else {
            console.log("running");
            continue;
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
};

export default docker_cron;
