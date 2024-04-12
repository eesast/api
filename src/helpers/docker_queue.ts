import cron from "node-cron";
import { docker_queue } from "..";
import Docker from "dockerode";
import jwt from "jsonwebtoken";
import { JwtServerPayload } from "../middlewares/authenticate";
import fs from "fs";
import * as hasura from "./hasura";
import * as utils from "./utils";
import yaml from "js-yaml";

export interface queue_element {
  contest_id: string;
  round_id?: string;
  room_id: string;
  map_id: string;
  team_label_binds: utils.TeamLabelBind[];
  competition: number;
  exposed: number;
  envoy: number;
}

const get_port = async (room_id: string, exposed_ports: string[], sub_base_dir: string) => {
  for (let i = 0; i < exposed_ports.length; ++i) {
    if (fs.existsSync(`${sub_base_dir}/${exposed_ports[i]}/finish.lock`)) {
      exposed_ports[i] = "";
    }
  }
  let result = -1;
  for (let i = 0; i < exposed_ports.length; ++i) {
    if (exposed_ports[i] === "") {
      exposed_ports[i] = room_id;
      result = i + 8888;
      break;
    }
  }
  return result;
}

const docker_cron = async () => {
  const max_container_num = parseInt(process.env.MAX_CONTAINERS! as string);
  const max_port_num = parseInt(process.env.MAX_PORTS! as string);
  const exposed_ports = new Array(max_port_num).fill("");
  const base_directory = await utils.get_base_directory();
  const url = process.env.NODE_ENV === "production" ? "https://api.eesast.com" : "http://172.17.0.1:28888";

  cron.schedule(`*/${process.env.QUEUE_CHECK_TIME!} * * * * *`, async () => {
    const docker = await utils.initDocker();
    const existing_containers = await docker.listContainers({ all: true });
    const existing_server_containers = existing_containers.filter((container_info) => container_info.Names.some((name) => name.includes("_Server_")));
    const existing_runner_containers = existing_containers.filter((container_info) => container_info.Names.some((name) => name.includes("_Runner_")));
    const running_containers_num = existing_server_containers.length + existing_runner_containers.length;

    console.debug("running_containers_num: " + running_containers_num);
    const available_num = Math.min((max_container_num - running_containers_num), docker_queue.length);
    console.debug("available_num: " + available_num);
    if (available_num <= 0) {
      console.log("no available container or queue is empty");
      return;
    }

    for (let i = 0; i < available_num; ++i) {
      try {
        const queue_front = docker_queue.shift();
        console.log("queue_front room id: " + queue_front?.room_id);
        if (!queue_front) {
          console.log("queue is empty");
          return;
        }
        const contest_name = await hasura.get_contest_name(queue_front.contest_id);
        const sub_base_dir = queue_front.competition === 1 ? `${base_directory}/${contest_name}/competition` : `${base_directory}/${contest_name}/arena`;
        const sub_url = queue_front.competition === 1 ? `${url}/competition` : `${url}/arena`;

        let container_running = false;
        const container_list = await docker.listContainers();
        container_list.forEach((container_info) => {
          if (container_info.Names.includes(`${contest_name}_Server_${queue_front.room_id}` || `${contest_name}_Runner_${queue_front.room_id}`)) {
            container_running = true;
          }
        });
        if (container_running) {
          console.log("container is already running");
          continue;
        }

        let port = 8080;
        if (queue_front.exposed === 1 || queue_front.envoy === 1) {
          port = await get_port(queue_front.room_id, exposed_ports, sub_base_dir);
          if (port === -1) {
            console.log("no port available")
            docker_queue.push(queue_front);
            return;
          }
        }

        const server_token = jwt.sign(
          {
            contest_id: queue_front.contest_id,
            round_id: queue_front.round_id,
            room_id: queue_front.room_id,
            team_ids: queue_front.team_label_binds.map((team_label_bind) => team_label_bind.team_id),
          } as JwtServerPayload,
          process.env.SECRET!,
          {
            expiresIn: utils.contest_image_map[contest_name].RUNNER_TIMEOUT,
          }
        );
        console.debug("server_token: ", server_token);

        const score_url = `${sub_url}/get-score`;
        const finish_url = queue_front.competition === 1 ? `${sub_url}/finish-one` : `${sub_url}/finish`;
        console.debug("score_url: ", score_url);
        console.debug("finish_url: ", finish_url);

        console.debug("team_labels: ", JSON.stringify(queue_front.team_label_binds))

        const new_containers: Docker.Container[] = [];
        if (contest_name === "THUAI6") {
          if (queue_front.exposed === 1) {
            const container_runner = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].RUNNER_IMAGE,
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                  `${base_directory}/${contest_name}/${queue_front.map_id}/map:/usr/local/map`,
                  `${sub_base_dir}/${queue_front.room_id}/source:/usr/local/code`
                ],
                PortBindings: {
                  '8888/tcp': [{ HostPort: `${port}` }]
                },
                AutoRemove: true,
                Memory: 6 * 1024 * 1024 * 1024,
                MemorySwap: 6 * 1024 * 1024 * 1024
              },
              ExposedPorts: { '8888/tcp': {} },
              Env: [
                `SCORE_URL=${score_url}`,
                `FINISH_URL=${finish_url}`,
                `TOKEN=${server_token}`,
                `TEAM_LABELS=${JSON.stringify(queue_front.team_label_binds)}`,
                `MAP_ID=${queue_front.map_id}`
              ],
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Runner_${queue_front.room_id}`,
            });
            new_containers.push(container_runner);

          } else {
            const container_runner = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].RUNNER_IMAGE,
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                  `${base_directory}/${contest_name}/${queue_front.map_id}/map:/usr/local/map`,
                  `${sub_base_dir}/${queue_front.room_id}/source:/usr/local/code`
                ],
                AutoRemove: true,
                Memory: 6 * 1024 * 1024 * 1024,
                MemorySwap: 6 * 1024 * 1024 * 1024
              },
              Env: [
                `SCORE_URL=${score_url}`,
                `FINISH_URL=${finish_url}`,
                `TOKEN=${server_token}`,
                `TEAM_LABELS=${JSON.stringify(queue_front.team_label_binds)}`,
                `MAP_ID=${queue_front.map_id}`
              ],
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Runner_${queue_front.room_id}`,
            });
            new_containers.push(container_runner);
          }

        } else {
          if (queue_front.envoy === 1) {
            const tcp_port1 = port - 1000
            const tcp_port2 = port + 1000

            const yamlPath = `${base_directory}/envoy.yaml`
            const envoyConfig: any = yaml.load(fs.readFileSync(yamlPath, { encoding: 'utf8' }));
            envoyConfig.static_resources.listeners[0].address.socket_address.port_value = tcp_port1
            envoyConfig.admin.address.socket_address.port_value = tcp_port2
            const newYamlPath = `${sub_base_dir}/${queue_front.room_id}/envoy/envoy.yaml`;
            fs.writeFileSync(newYamlPath, yaml.dump(envoyConfig));

            const container_envoy = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].ENVOY_IMAGE,
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/envoy:/etc/envoy`
                ],
                PortBindings: {
                  [`${tcp_port1}/tcp`]: [{ HostPort: `${tcp_port1}` }],
                  [`${tcp_port2}/tcp`]: [{ HostPort: `${tcp_port2}` }]
                },
                AutoRemove: true
              },
              ExposedPorts: { [`${tcp_port1}/tcp`]: {}, [`${tcp_port2}/tcp`]: {} },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Envoy_${queue_front.room_id}`,
            });
            new_containers.push(container_envoy);
          }

          if (queue_front.exposed === 1) {
            const container_server = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].SERVER_IMAGE,
              Env: [
                `SCORE_URL=${score_url}`,
                `FINISH_URL=${finish_url}`,
                `TOKEN=${server_token}`,
                `TEAM_LABELS=${JSON.stringify(queue_front.team_label_binds)}`,
                `MAP_ID=${queue_front.map_id}`
              ],
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                  `${base_directory}/${contest_name}/${queue_front.map_id}/map:/usr/local/map`
                ],
                PortBindings: {
                  '8888/tcp': [{ HostPort: `${port}` }]
                },
                AutoRemove: true
              },
              ExposedPorts: { '8888/tcp': {} },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Server_${queue_front.room_id}`,
            });
            new_containers.push(container_server);

          } else {
            const container_server = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].SERVER_IMAGE,
              Env: [
                `SCORE_URL=${score_url}`,
                `FINISH_URL=${finish_url}`,
                `TOKEN=${server_token}`,
                `TEAM_LABELS=${JSON.stringify(queue_front.team_label_binds)}`,
                `MAP_ID=${queue_front.map_id}`
              ],
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                  `${base_directory}/${contest_name}/${queue_front.map_id}/map:/usr/local/map`
                ],
                AutoRemove: true
              },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Server_${queue_front.room_id}`,
            });
            new_containers.push(container_server);
          }

          const container_client_promises = queue_front.team_label_binds.map(async (team_label_bind) => {
            const container_client = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].CLIENT_IMAGE,
              Env: [
                `TEAM_LABEL=${team_label_bind.label}`
              ],
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/source:/usr/local/code`
                ],
                AutoRemove: true,
                Memory: 6 * 1024 * 1024 * 1024,
                MemorySwap: 6 * 1024 * 1024 * 1024
              },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Client_${team_label_bind.team_id}_${queue_front.room_id}`,
            });
            return container_client;
          });
          const container_clients = await Promise.all(container_client_promises);
          new_containers.push(...container_clients);

        }
        console.log("new containers created");

        new_containers.forEach(async (container) => {
          await container.start();
        });
        console.log("server and clients started");

        if (queue_front.exposed === 1 || queue_front.envoy === 1) {
          await hasura.update_room_status(queue_front.room_id, "Running", port);
        } else {
          await hasura.update_room_status(queue_front.room_id, "Running", null);
        }
        console.log("room status updated");

        const waitAllContainers = new_containers.map(container =>
          new Promise(() => {
            container.wait();
          })
        );

        Promise.all(waitAllContainers)
        .then(async () => {
          try {
            await fs.promises.writeFile(`${sub_base_dir}/${queue_front.room_id}/finish.lock`, "");
            console.log("finish.lock file was written successfully.");
          } catch (err) {
            console.error("An error occurred writing finish.lock:", err);
          }
        })
        .catch(err => {
          console.error("An error occurred waiting for containers to finish:", err);
        });

        setTimeout(() => {
          new_containers.forEach(async (container) => {
            await container.stop();
            await container.remove();
          });
        }, (process.env.GAME_TIME ? Number(process.env.GAME_TIME) : 600 + 5 * 60) * 1000);

      } catch (err) {
        console.error("An error occurred in docker_cron:", err);
        continue;
      }
    }
  });
}

export default docker_cron;
