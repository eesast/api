import cron from "node-cron";
import { docker_queue } from "..";
import Docker from "dockerode";
import jwt from "jsonwebtoken";
import { JwtServerPayload } from "../middlewares/authenticate";
import fs from "fs";
import * as fs_promises from "fs/promises"
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

const get_port = async () => {
  const max_port_num = parseInt(process.env.MAX_PORTS! as string);
  const start_port = 8888;
  const ports_list = await hasura.get_exposed_ports();
  for (var i = 0; i < max_port_num; i++) {
    const result = start_port + i;
    var flag = false;
    for (const port_info of ports_list) {
      if (port_info.port === result) {
        flag = true;
        break;
      }
    }
    if (!flag) {
      return result;
    }
  }
  return -1;
}

const upload_contest_files = async (sub_base_dir: string, queue_front: queue_element) => {
  const contest_name = await hasura.get_contest_name(queue_front.contest_id);
  try {
    await fs_promises.access(`${sub_base_dir}/${queue_front.room_id}/output`);
    try {
      const cos = await utils.initCOS();
      const config = await utils.getConfig();
      const file_name = await fs_promises.readdir(`${sub_base_dir}/${queue_front.room_id}/output`);
      const upload_file_promises = file_name.map(filename => {
        const suffix = filename.split(".")[1];
        const key = `${contest_name}/arena/${queue_front.room_id}/${queue_front.room_id}.${suffix}`;
        const localFilePath = `${sub_base_dir}/${queue_front.room_id}/output/${filename}`;
        return utils.uploadObject(localFilePath, key, cos, config)
          .then(() => {
            return Promise.resolve(true);
          })
          .catch((err) => {
            console.log(`Upload ${filename} failed: ${err}`);
            return Promise.resolve(false);
          });
      });
      const upload_file = await Promise.all(upload_file_promises);
      console.debug("upload_file: ", upload_file);
      if (upload_file.some(result => !result)) {
        console.log("File upload failed");
      }
      console.log("Files uploaded!")

    } catch (err) {
      console.log("Upload files failed. " + err);
    }

  } catch (err) {
    console.log("No output files found!");
  } finally {
    try {
      // if dir exists, delete it
      const dir_to_remove = `${sub_base_dir}/${queue_front.room_id}`;
      console.log("Trying to remove dir: ", dir_to_remove);
      if (await utils.checkPathExists(dir_to_remove)) {
        await utils.deleteAllFilesInDir(dir_to_remove);
        console.log(`Directory deleted: ${dir_to_remove}`);
      } else {
        console.log(`Directory not found, skipped deletion: ${dir_to_remove}`);
      }
    } catch (err) {
      console.log("Delete Contest files failed. " + err);
    }
  }
}

const docker_cron = async () => {
  const max_container_num = parseInt(process.env.MAX_CONTAINERS! as string);
  const base_directory = await utils.get_base_directory();
  const url = process.env.NODE_ENV === "production" ? "https://api.eesast.com" : "http://172.17.0.1:28888";

  cron.schedule(`*/${process.env.QUEUE_CHECK_TIME!} * * * * *`, async () => {
    try {

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

          const port = await get_port();
          if (port === -1) {
            console.log("no port available")
            docker_queue.push(queue_front);
            return;
          }

          const server_token = jwt.sign(
            {
              contest_id: queue_front.contest_id,
              round_id: queue_front.round_id,
              room_id: queue_front.room_id,
              team_label_binds: queue_front.team_label_binds,
            } as JwtServerPayload,
            process.env.SECRET!,
            {
              expiresIn: utils.contest_image_map[contest_name].RUNNER_TIMEOUT,
            }
          );

          const score_url = `${sub_url}/get-score`;
          const finish_url = queue_front.competition === 1 ? `${sub_url}/finish-one` : `${sub_url}/finish`;
          console.debug("score_url: ", score_url);
          console.debug("finish_url: ", finish_url);

          console.debug("team_labels: ", JSON.stringify(queue_front.team_label_binds))
          console.log(utils.contest_image_map[contest_name])

          const new_containers: Docker.Container[] = [];

          if (queue_front.envoy === 1) {
            const tcp_port1 = port - 1000
            const tcp_port2 = port + 1000

            const yamlPath = `${base_directory}/envoy.yaml`;
            const envoyConfig: any = yaml.load(fs.readFileSync(yamlPath, { encoding: 'utf8' }));
            // assign port
            envoyConfig.static_resources.listeners[0].address.socket_address.port_value = tcp_port1;
            envoyConfig.admin.address.socket_address.port_value = tcp_port2;
            envoyConfig.static_resources.clusters[0].load_assignment.endpoints[0].lb_endpoints[0].endpoint.address.socket_address.port_value = port;

            const envoy_dir = `${sub_base_dir}/${queue_front.room_id}/envoy`
            fs.mkdirSync(envoy_dir, { recursive: true });
            const newYamlPath = `${envoy_dir}/envoy.yaml`;
            console.log("tring to write")
            fs.writeFileSync(newYamlPath, yaml.dump(envoyConfig));
            console.log('wirte sruceess')

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
                AutoRemove: true,
              },
              ExposedPorts: { [`${tcp_port1}/tcp`]: {}, [`${tcp_port2}/tcp`]: {} },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Envoy_${queue_front.room_id}`,
            });
            new_containers.push(container_envoy);
          }
          console.log("envoy pushd");

          const container_server = await docker.createContainer({
            Image: utils.contest_image_map[contest_name].RUNNER_IMAGE,
            Env: [
              `TERMINAL=SERVER`,
              `TOKEN=${server_token}`,
              `MAX_GAME_TIME=${process.env.GAME_TIME}`,
              `MAP_ID=${queue_front.map_id}`,
              `SCORE_URL=${score_url}`,
              `FINISH_URL=${finish_url}`,
              `TEAM_LABELS=${queue_front.team_label_binds.map((item) => {
                return `${item.label}`
              }).join(":")}`,
              `EXPOSED=${queue_front.exposed}`,
              `MODE=${queue_front.competition === 1 ? "COMPETITON" : "ARENA"}`,
            ],
            HostConfig: {
              Binds: [
                `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                `${base_directory}/${contest_name}/map/${queue_front.map_id}:/usr/local/map`
              ],
              PortBindings: {
                '8888/tcp': [{ HostPort: `${port}` }]
              },
              AutoRemove: true,
              Memory: 2 * 1024 * 1024 * 1024,
              MemorySwap: 2 * 1024 * 1024 * 1024
            },
            ExposedPorts: { '8888/tcp': {} },
            AttachStdin: false,
            AttachStdout: false,
            AttachStderr: false,
            name: `${contest_name}_Server_${queue_front.room_id}`,
          });
          new_containers.push(container_server);

          console.log("server docker pushd");

          console.log("team label: " + JSON.stringify(queue_front.team_label_binds));
          const container_client_promises = queue_front.team_label_binds.map(async (team_label_bind, team_index) => {
            const container_client = await docker.createContainer({
              Image: utils.contest_image_map[contest_name].RUNNER_IMAGE,
              Env: [
                `TERMINAL=CLIENT`,
                `TEAM_SEQ_ID=${team_index}`,
                `TEAM_LABEL=${team_label_bind.label}`,
                `PORT=${port}`,
              ],
              HostConfig: {
                Binds: [
                  `${sub_base_dir}/${queue_front.room_id}/output:/usr/local/output`,
                  `${sub_base_dir}/${queue_front.room_id}/source/${team_label_bind.team_id}:/usr/local/code`
                ],
                AutoRemove: true,
                Memory: 2 * 1024 * 1024 * 1024,
                MemorySwap: 2 * 1024 * 1024 * 1024
              },
              AttachStdin: false,
              AttachStdout: false,
              AttachStderr: false,
              name: `${contest_name}_Client_${queue_front.room_id}_${team_label_bind.team_id}`,
            });
            return container_client;
          });
          console.log("client docker pushd");
          const container_clients = await Promise.all(container_client_promises);
          new_containers.push(...container_clients);

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

          // force stop after GAME_TIME
          setTimeout(() => {
            new_containers.forEach(async (container) => {
              try {
                console.log("Time is Out! inspecting docker container: " + container.id)
                container.inspect(async (err, data) => {
                  if (err) {
                    console.log("Container is not running. Fine.");
                  } else {
                    if (data?.State.Running) {
                      console.log("");
                      console.log(`Container is still running, but time is out! Removing container (forced) ${container.id}`);
                      await container.remove({
                        force: true
                      });
                      console.log(`Container removed: ${container.id}}`);
                      // Update the room status as `Crashed`
                      await hasura.update_room_status(queue_front.room_id, "Crashed", null);
                      // Upload the log to cos and delete the container
                      await upload_contest_files(sub_base_dir, queue_front);
                    } else {
                      console.log("Container is not running");
                    }
                  }
                });
              } catch (err) {
                console.error("An error occurred in docker_cron:", err);
              }
            });
          }, (process.env.GAME_TIME ? Number(process.env.GAME_TIME) : 600 + 5 * 60) * 1000);

        } catch (err) {
          console.error("An error occurred in docker_cron:", err);
          continue;
        }
      }
    } catch (err) {
      console.error("An error occurred in docker_cron:", err);
      return;
    }
  });
}

export default docker_cron;
