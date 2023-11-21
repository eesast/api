import cron from "node-cron";
import { docker_queue } from "..";
import Docker from "dockerode";
import jwt from "jsonwebtoken";
import { JwtServerPayload } from "../routes/contest";
import { gql } from "graphql-request";
import { client } from "..";
import fs from "fs";
import { base_directory, get_contest_name } from "./utils";

export interface queue_element {
  contest_id: string;
  room_id: string;
  team_id_1: string;
  team_id_2: string;
  map: number;
  arenic: number;
  exposed: number;
}

const get_port = async (room_id: string, exposed_ports: Array<string>, sub_base_dic: string) => {
  let result = -1;
  for (let i = 0; i < exposed_ports.length; ++i) {
    if (exposed_ports[i] === "") {
      exposed_ports[i] = room_id;
      result = i + 8888;
      break;
    }
  }
  if (result === -1) {
    for (let i = 0; i < exposed_ports.length; ++i) {
      if (fs.existsSync(`${sub_base_dic}/${exposed_ports[i]}/finish.lock`)) {
        exposed_ports[i] = "";
      }
    }
    for (let i = 0; i < exposed_ports.length; ++i) {
      if (exposed_ports[i] === "") {
        exposed_ports[i] = room_id;
        result = i + 8888;
        break;
      }
    }
  }
  return result;
}

const docker_cron = () => {
  const port_num = parseInt(process.env.MAX_CONTAINERS as string);
  const exposed_ports = new Array(port_num).fill("");

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
      // 取空闲容器数目与队列长度的最小值作为循环次数
      const existing_containers = await docker.listContainers({
        all: true,
      });
      const available_num = Math.min(
        (max_container_num - existing_containers.length),
        docker_queue.length
      );
      if (available_num <= 0) {
        return;
      }

      for (let i = 0; i < available_num; ++i) {
        try {
          // 取出元素
          const queue_front = docker_queue.shift() as queue_element;
          if(queue_front === undefined){
            return;
          }
          const contest_name = await get_contest_name(queue_front.contest_id);
          const sub_base_dic = queue_front.arenic == 1 ? `${base_directory}/${contest_name}/arena` : `${base_directory}/${contest_name}/competition`;

          // 检查对战双方是否通过编译，否则丢弃
          const query_if_compiled = await client.request(
            gql`
              query query_if_compiled($contest_id: uuid!, $team_id: [uuid!]) {
                contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_in: $team_id}}}) {
                  status
                }
              }
            `,
            {
              contest_id: queue_front.contest_id,
              team_id: [queue_front.team_id_1, queue_front.team_id_2]
            }
          );
          let all_compiled = true;
          query_if_compiled.contest_team.forEach((element: { status: string }) => {
            if (element.status != "compiled") {
              all_compiled = false;
            }
          });
          if (!all_compiled) {
            continue;
          }

          // 检查是否有容器正在进行同一场比赛，有则丢弃
          let containerRunning = false;
          const containerList = await docker.listContainers();
          containerList.forEach((containerInfo) => {
            if (
              containerInfo.Names.includes(
                `/${contest_name}_runner_${queue_front?.room_id}`
              )
            ) {
              containerRunning = true;
            }
          });
          if(containerRunning){
            continue;
          }

          // 配置token/url，容器内使用
          const serverToken = jwt.sign(
            {
              contest_id: queue_front.contest_id,
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
          
          // 声明新容器
          let container_runner: Docker.Container;

          // 若开放直播，则需安排观战端口
          if (queue_front.exposed) {
            const port = await get_port(queue_front.room_id, exposed_ports, sub_base_dic);
            // 理论上限制端口数不少于闲置容器数，故此处是否赘余？
            if (port === -1) {
              console.log("no port available")
              continue;
            }

            // 创建容器
            container_runner = await docker.createContainer({
              Image: process.env.RUNNER_IMAGE,
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_runner_${queue_front.room_id}`,
              HostConfig: {
                Binds: [
                  `${sub_base_dic}/${queue_front.room_id}/:/usr/local/playback`,
                  `${base_directory}/${contest_name}/map/:/usr/local/map`,
                  `${base_directory}/${contest_name}/code/${queue_front.team_id_1}/:/usr/local/team1`,
                  `${base_directory}/${contest_name}/code/${queue_front.team_id_2}/:/usr/local/team2`
                ],
                PortBindings: {
                  '8888/tcp': [{HostPort: `${port}`}]
                },
                AutoRemove: true,
                Memory: 6*1024*1024*1024,
                MemorySwap: 6*1024*1024*1024
              },
              ExposedPorts: {'8888/tcp': {}},
              Env: [
                `URL=${url}`,
                `TOKEN=${serverToken}`,
                `MODE=${1 - queue_front.arenic}`,
                `MAP=${queue_front.map == 0 ? `/usr/local/map/oldmap.txt` : `/usr/local/map/newmap.txt`}`,
                `EXPOSED=${queue_front.exposed}`,
                `TIME=${process.env.GAME_TIME}`
              ],
            });

            await container_runner.start();
            console.log("runnner started");

            // 若创建房间
            if(queue_front.arenic == 1){
              await client.request(
                gql`
                  mutation update_room_port($room_id: uuid!, $port: Int, $contest_id: uuid){
                    update_contest_room(where: {_and: [{contest_id: {_eq: $contest_id}}, {room_id: {_eq: $room_id}}]}, _set: {port: $port}){
                      returning{
                        port
                      }
                    }
                  }
                `,
                {
                  contest_id: queue_front.contest_id,
                  room_id: queue_front.room_id,
                  port: port,
                }
              );
            }

            container_runner.wait(async() => {
              if(queue_front.arenic == 1){
                await client.request(
                  gql`
                    mutation update_room_port($room_id: uuid!, $port: Int, $contest_id: uuid){
                      update_contest_room(where: {_and: [{contest_id: {_eq: $contest_id}}, {room_id: {_eq: $room_id}}]}, _set: {port: $port}){
                        returning{
                          port
                        }
                      }
                    }
                  `,
                  {
                    contest_id: queue_front.contest_id,
                    room_id: queue_front.room_id,
                    port: null,
                  }
                );
              }

              fs.mkdir(`${sub_base_dic}/${queue_front.room_id}`, {recursive: true}, (err)=>{
                if(err) {
                  throw err;
                }
                fs.writeFile(`${sub_base_dic}/${queue_front.room_id}/finish.lock`, "", (err)=>{
                  if(err) {
                    throw err;
                  }
                })
              });
            });
          }

          // 否则只需运行比赛
          else {
            container_runner = await docker.createContainer({
              Image: process.env.RUNNER_IMAGE,
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_runner_${queue_front.room_id}`,
              HostConfig: {
                Binds: [
                  `${sub_base_dic}/${queue_front.room_id}/:/usr/local/playback`,
                  `${base_directory}/${contest_name}/map/:/usr/local/map`,
                  `${base_directory}/${contest_name}/code/${queue_front.team_id_1}/:/usr/local/team1`,
                  `${base_directory}/${contest_name}/code/${queue_front.team_id_2}/:/usr/local/team2`
                ],
                AutoRemove: true,
                Memory: 6*1024*1024*1024, //6G
                MemorySwap: 6*1024*1024*1024
              },
              Env: [
                `URL=${url}`,
                `TOKEN=${serverToken}`,
                `MODE=${1 - queue_front.arenic}`,
                `MAP=${queue_front.map == 0 ? `/usr/local/map/oldmap.txt` : `/usr/local/map/newmap.txt`}`,
                `EXPOSED=${queue_front.exposed}`,
                `TIME=${process.env.GAME_TIME}`
              ],
            });

            await container_runner.start();
            console.log("runnner started");
          }

          setTimeout(() => {
            container_runner.stop(() => {
              console.log("container forced to stop")
            });
          }, (process.env.GAME_TIME ? Number(process.env.GAME_TIME) : 600 + 5 * 60) * 1000);
        } catch (err) {
          console.log(err);
          continue;
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
};

export default docker_cron;
