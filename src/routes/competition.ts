import express from "express";
import jwt from "jsonwebtoken";
import { docker_queue } from "..";
import authenticate from "../middlewares/authenticate";
import * as fs from "fs/promises";
import * as utils from "../helpers/utils";
import * as COS from "../helpers/cos";
import * as ContConf from "../configs/contest";
import * as ContHasFunc from "../hasura/contest";

const router = express.Router();

/**
 * @param token
 * @param {string} round_id
 * @param {number} exposed (0 or 1, default 0)
 * @param {number} envoy (0 or 1, default 0)
 */
router.post("/start-all", authenticate(), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const round_id = req.body.round_id;
    const exposed = req.body.exposed ?? 0;
    const envoy = req.body.envoy ?? 0;
    console.debug("user_uuid: ", user_uuid);
    console.debug("round_id: ", round_id);
    if (!user_uuid || !round_id) {
      return res
        .status(422)
        .send("422 Unprocessable Entity: Missing credentials");
    }

    const { contest_id, map_id } = await ContHasFunc.get_round_info(round_id);
    const contest_name = await ContHasFunc.get_contest_name(contest_id);

    const is_manager = await ContHasFunc.get_maneger_from_user(
      user_uuid,
      contest_id,
    );
    console.debug("is_manager: ", is_manager);
    if (!is_manager) {
      return res.status(403).send("403 Forbidden: Not a manager");
    }

    const {
      team_labels,
      players_labels,
    }: { team_labels: string[]; players_labels: string[] } =
      await ContHasFunc.get_contest_players(contest_id);
    const team_labels_unique = Array.from(new Set(team_labels));
    console.debug("team_labels: ", team_labels);
    console.debug("players_labels: ", players_labels);

    const team_list: string[] = await ContHasFunc.get_all_teams(contest_id);
    const team_player_list: {
      team_id: string;
      team_label: string;
      player_label: string;
    }[] = [];
    team_list.forEach((team_id) => {
      players_labels.forEach((player_label, index) => {
        team_player_list.push({
          team_id,
          team_label: team_labels[index],
          player_label,
        });
      });
    });
    console.debug("team_list: ", team_list);
    console.debug("team_players_list: ", team_player_list);

    const code_role_promises = team_player_list.map((team_player) =>
      ContHasFunc.get_player_code(
        team_player.team_id,
        team_player.player_label,
      ),
    );
    const code_role_list: { code_id: string; role: string }[] =
      await Promise.all(code_role_promises);
    console.debug("code_role_list: ", code_role_list);

    const team_list_filtered: string[] = [];
    const team_player_list_filtered: {
      team_id: string;
      team_label: string;
      player_label: string;
    }[] = [];
    const code_role_list_filtered: { code_id: string; role: string }[] = [];
    for (let i = 0; i < team_player_list.length; i += players_labels.length) {
      // if (code_role_list.slice(i, i + players_labels.length).every(player => player.code_id && player.role)) {
      if (
        code_role_list
          .slice(i, i + players_labels.length)
          .every((player) => player.code_id)
      ) {
        team_list_filtered.push(team_list[i / players_labels.length]);
        team_player_list_filtered.push(
          ...team_player_list.slice(i, i + players_labels.length),
        );
        code_role_list_filtered.push(
          ...code_role_list.slice(i, i + players_labels.length),
        );
      }
    }
    console.debug("team_list_filtered: ", team_list_filtered);
    console.debug("team_players_list_filtered: ", team_player_list_filtered);
    console.debug("code_role_list_filtered: ", code_role_list_filtered);

    const code_detail_promises = code_role_list_filtered.map((player_detail) =>
      ContHasFunc.get_compile_status(player_detail.code_id),
    );
    const code_detail_list = await Promise.all(code_detail_promises);

    const team_list_available: string[] = [];
    const details_list_available: {
      team_id: string;
      team_label: string;
      player_label: string;
      code_id: string;
      role: string;
      compile_status: string;
      language: string;
    }[] = [];
    for (
      let i = 0;
      i < team_player_list_filtered.length;
      i += players_labels.length
    ) {
      if (
        code_detail_list
          .slice(i, i + players_labels.length)
          .every(
            (code) =>
              code.compile_status === "Completed" ||
              code.compile_status === "No Need",
          ) &&
        code_detail_list
          .slice(i, i + players_labels.length)
          .every((code) => code.language === "cpp" || code.language === "py")
      ) {
        team_list_available.push(team_list_filtered[i / players_labels.length]);
        details_list_available.push(
          ...team_player_list_filtered
            .slice(i, i + players_labels.length)
            .map((player, index) => ({
              team_id: player.team_id,
              team_label: player.team_label,
              player_label: player.player_label,
              code_id: code_role_list_filtered[i + index].code_id,
              role: code_role_list_filtered[i + index].role,
              compile_status: code_detail_list[i + index].compile_status,
              language: code_detail_list[i + index].language,
            })),
        );
      }
    }
    console.debug("team_list_available: ", team_list_available);
    console.debug("details_list_available: ", details_list_available);

    console.log("Dependencies checked!");

    res.status(200).send("200 OK: Dependencies checked!");

    const base_directory = await utils.get_base_directory();

    const mkdir_promises = team_list_available.map((team_id) => {
      return fs
        .mkdir(`${base_directory}/${contest_name}/code/${team_id}/source`, {
          recursive: true,
        })
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Mkdir ${team_id} failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const mkdir_result = await Promise.all(mkdir_promises);
    console.debug("mkdir_result: ", mkdir_result);
    if (mkdir_result.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Code directory creation failed");
      return;
    }

    console.log("Directories created!");

    const files_exist_promises = details_list_available.map((detail) => {
      const language = detail.language;
      const code_file_name =
        language === "cpp" ? `${detail.code_id}` : `${detail.code_id}.py`;
      return fs
        .access(
          `${base_directory}/${contest_name}/code/${detail.team_id}/source/${code_file_name}`,
        )
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    });
    const files_exist = await Promise.all(files_exist_promises);
    console.debug("files_exist: ", files_exist);

    const player_codes_unique = Array.from(
      new Set(details_list_available.map((player) => player.code_id)),
    );
    const index_map = player_codes_unique.map((player_code) =>
      details_list_available.findIndex(
        (player) => player.code_id === player_code,
      ),
    );
    console.debug("player_codes_unique: ", player_codes_unique);
    console.debug("index_map: ", index_map);

    const cos = await COS.initCOS();
    const config = await COS.getConfig();
    const download_promises = player_codes_unique.map((player_code, index) => {
      if (files_exist[index_map[index]]) {
        return Promise.resolve(true);
      }
      const language = details_list_available[index_map[index]].language;
      const code_file_name =
        language === "cpp" ? `${player_code}` : `${player_code}.py`;
      console.debug("code_file_name: ", code_file_name);
      return fs
        .mkdir(
          `${base_directory}/${contest_name}/code/${details_list_available[index_map[index]].team_id}/source`,
          { recursive: true },
        )
        .then(() => {
          return COS.downloadObject(
            `${contest_name}/code/${details_list_available[index_map[index]].team_id}/${code_file_name}`,
            `${base_directory}/${contest_name}/code/${details_list_available[index_map[index]].team_id}/source/${code_file_name}`,
            cos,
            config,
          );
        })
        .then(() => {
          return fs.chmod(
            `${base_directory}/${contest_name}/code/${details_list_available[index_map[index]].team_id}/source/${code_file_name}`,
            0o755,
          );
        })
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Download ${code_file_name} failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const download_results = await Promise.all(download_promises);
    console.debug("download_results: ", download_results);
    if (download_results.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Code download failed");
      return;
    }

    console.log("Code downloaded!");

    const map_files_count = await fs
      .readdir(`${base_directory}/${contest_name}/map/${map_id}`)
      .then((files) => {
        return files.length;
      })
      .catch((err) => {
        console.log(`Read ${map_id} files failed: ${err}`);
        return -1;
      });
    console.debug("map_files_count: ", map_files_count);

    if (map_files_count > 1) {
      await utils.deleteAllFilesInDir(
        `${base_directory}/${contest_name}/map/${map_id}`,
      );
    }
    if (map_files_count !== 1) {
      await fs.mkdir(`${base_directory}/${contest_name}/map/${map_id}`, {
        recursive: true,
      });
      const map_filename = await ContHasFunc.get_map_name(map_id);
      await COS.downloadObject(
        `${contest_name}/map/${map_filename}`,
        `${base_directory}/${contest_name}/map/${map_id}/${map_id}.txt`,
        cos,
        config,
      ).catch((err) => {
        console.log(`Download ${map_id}.txt failed: ${err}`);
        // return res.status(500).send("500 Internal Server Error: Map download failed");
        return;
      });
    }

    console.log("Map downloaded!");

    const pairs_unfold: [
      team_label1: string,
      team_label2: string,
      team1: string,
      team2: string,
    ][] = [];
    if (team_labels_unique.length === 1) {
      for (let i = 0; i < team_list_available.length; i++) {
        for (let j = i + 1; j < team_list_available.length; j++) {
          pairs_unfold.push([
            team_labels_unique[0],
            team_labels_unique[0],
            team_list_available[i],
            team_list_available[j],
          ]);
        }
      }
    } else {
      for (let i = 0; i < team_labels_unique.length; i++) {
        for (let j = i + 1; j < team_labels_unique.length; j++) {
          for (let k = 0; k < team_list_available.length; k++) {
            for (let l = k + 1; l < team_list_available.length; l++) {
              pairs_unfold.push([
                team_labels_unique[i],
                team_labels_unique[j],
                team_list_available[k],
                team_list_available[l],
              ]);
              pairs_unfold.push([
                team_labels_unique[j],
                team_labels_unique[i],
                team_list_available[k],
                team_list_available[l],
              ]);
            }
          }
        }
      }
    }

    const start_competition_promises = pairs_unfold.map((pair) => {
      let team1_label = pair[0];
      let team2_label = pair[1];
      let team1_id = pair[2];
      let team2_id = pair[3];

      // 临时代码，处理 THUAI8 由于 hardcode 导致的 Buddhist 必须在 Monster 前面的 BUG
      if (
        contest_name === "THUAI8" &&
        team1_label === "Monster" &&
        team2_label === "Buddhist"
      ) {
        team1_label = "Buddhist";
        team2_label = "Monster";
        const temp = team1_id;
        team1_id = team2_id;
        team2_id = temp;
      }

      const details_list_filtered_1 = details_list_available.filter(
        (player) =>
          player.team_id === team1_id && player.team_label === team1_label,
      );
      const details_list_filtered_2 = details_list_available.filter(
        (player) =>
          player.team_id === team2_id && player.team_label === team2_label,
      );
      const player_labels_flat = details_list_filtered_1
        .map((player) => player.player_label)
        .concat(details_list_filtered_2.map((player) => player.player_label));
      const team1_codes = details_list_filtered_1.map(
        (player) => player.code_id,
      );
      const team2_codes = details_list_filtered_2.map(
        (player) => player.code_id,
      );
      const player_codes_flat = team1_codes.concat(team2_codes);
      const team1_roles = details_list_filtered_1.map((player) => player.role);
      const team2_roles = details_list_filtered_2.map((player) => player.role);
      const code_languages_flat = details_list_filtered_1
        .map((player) => player.language)
        .concat(details_list_filtered_2.map((player) => player.language));
      const team_ids_flat = details_list_filtered_1
        .map((player) => player.team_id)
        .concat(details_list_filtered_2.map((player) => player.team_id));

      let room_id: string;

      return ContHasFunc.insert_room_competition(
        contest_id,
        "Waiting",
        map_id,
        round_id,
      )
        .then((room_id_: string | null) => {
          if (!room_id_) {
            return Promise.resolve(false);
          } else {
            room_id = room_id_;
          }
          console.debug("room_id: ", room_id);
          return ContHasFunc.insert_room_teams(
            room_id,
            [team1_id, team2_id],
            [team1_label, team2_label],
            [team1_roles, team2_roles],
            [team1_codes, team2_codes],
          );
        })
        .then((affected_rows: number) => {
          if (affected_rows !== 2) {
            return Promise.resolve(false);
          }
          return fs.mkdir(
            `${base_directory}/${contest_name}/competition/${room_id}/source`,
            { recursive: true },
          );
        })
        .then(() => {
          const copy_promises = player_codes_flat.map((player_code, index) => {
            const language = code_languages_flat[index];
            const code_file_name =
              language === "cpp" ? `${player_code}` : `${player_code}.py`;
            const competition_file_name =
              language === "cpp"
                ? `${player_labels_flat[index]}`
                : `${player_labels_flat[index]}.py`;
            return fs
              .mkdir(
                `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}`,
                { recursive: true },
              )
              .then(() => {
                // return fs.copyFile(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
                //   `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}/${competition_file_name}`)
                return fs.symlink(
                  `${base_directory}/${contest_name}/code/${team_ids_flat[index]}/source/${code_file_name}`,
                  `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}/${competition_file_name}`,
                );
              })
              .then(() => {
                return Promise.resolve(true);
              })
              .catch((err) => {
                console.log(`Copy ${code_file_name} failed: ${err}`);
                return Promise.resolve(false);
              });
          });
          return Promise.all(copy_promises);
        })
        .then((copy_result: boolean[]) => {
          console.debug("copy_result: ", copy_result);
          if (copy_result.some((result) => !result)) {
            return Promise.resolve(false);
          }
          docker_queue.push({
            contest_id: contest_id,
            round_id: round_id,
            room_id: room_id,
            map_id: map_id,
            team_label_binds: [
              { team_id: team1_id, label: team1_label },
              { team_id: team2_id, label: team2_label },
            ],
            competition: 1,
            exposed: exposed,
            envoy: envoy,
          });
          return Promise.resolve(true);
        })
        .catch((err: any) => {
          console.log(`Start competition failed: ${err}`);
          return Promise.resolve(false);
        });
    });

    const start_results = await Promise.all(start_competition_promises);
    console.debug("start_results: ", start_results);
    if (start_results.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Competition start failed");
      return;
    }

    console.log("Competitions started!");

    // return res.status(200).send("200 OK: Competition Created!");
    return;
  } catch (err) {
    console.error(err);
    // return res.status(500).send("500 Internal Server Error: " + err);
    return;
  }
});

/**
 * @param token
 * @param {string} round_id
 * @param {utils.TeamLabelBind[]} team_labels
 * @param {number} exposed (0 or 1, default 0)
 * @param {number} envoy (0 or 1, default 0)
 */
router.post("/start-one", authenticate(), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const team_label_binds: ContConf.TeamLabelBind[] = req.body.team_labels;
    const round_id = req.body.round_id;
    const exposed = req.body.exposed || 0;
    const envoy = req.body.envoy || 0;
    console.debug("user_uuid: ", user_uuid);
    console.debug("round_id: ", round_id);
    console.debug("team_labels: ", team_label_binds);

    if (!user_uuid || !round_id || team_label_binds.length < 2) {
      return res
        .status(422)
        .send("422 Unprocessable Entity: Missing credentials");
    }

    const { contest_id, map_id } = await ContHasFunc.get_round_info(round_id);
    const contest_name = await ContHasFunc.get_contest_name(contest_id);
    console.debug("contest_id: ", contest_id);
    console.debug("map_id: ", map_id);
    console.debug("contest_name: ", contest_name);
    if (!contest_id || !map_id || !contest_name) {
      return res.status(400).send("400 Bad Request: Contest not found");
    }

    // 临时代码，处理 THUAI8 由于 hardcode 导致的 Buddhist 必须在 Monster 前面的 BUG
    if (contest_name === "THUAI8") {
      const buddhistIndex = team_label_binds.findIndex(
        (bind) => bind.label === "Buddhist",
      );
      const monsterIndex = team_label_binds.findIndex(
        (bind) => bind.label === "Monster",
      );
      if (buddhistIndex !== -1 && monsterIndex !== -1) {
        const temp = team_label_binds[buddhistIndex];
        team_label_binds[buddhistIndex] = team_label_binds[monsterIndex];
        team_label_binds[monsterIndex] = temp;
      }
    }

    const { team_ids, team_labels } = team_label_binds.reduce(
      (acc, team_label_bind) => {
        acc.team_ids.push(team_label_bind.team_id);
        acc.team_labels.push(team_label_bind.label);
        return acc;
      },
      { team_ids: [] as string[], team_labels: [] as string[] },
    );
    console.debug("team_ids: ", team_ids);
    console.debug("team_labels: ", team_labels);

    const is_manager = await ContHasFunc.get_maneger_from_user(
      user_uuid,
      contest_id,
    );
    console.debug("is_manager: ", is_manager);
    if (!is_manager) {
      return res.status(403).send("403 Forbidden: Not a manager");
    }

    const players_labels_promises = team_labels.map((team_label) =>
      ContHasFunc.get_players_label(contest_id, team_label),
    );
    const players_labels: string[][] = await Promise.all(
      players_labels_promises,
    );
    console.debug("players_labels: ", players_labels);
    if (players_labels.some((player_labels) => !player_labels)) {
      return res.status(400).send("400 Bad Request: Players_label not found");
    }

    const player_labels_flat = players_labels.flat();
    const team_ids_flat = team_ids.flatMap((team_id, index) =>
      Array(players_labels[index].length).fill(team_id),
    );
    console.debug("player_labels_flat: ", player_labels_flat);
    console.debug("team_ids_flat: ", team_ids_flat);

    const players_details_promises = player_labels_flat.map(
      (player_label, index) =>
        ContHasFunc.get_player_code(team_ids_flat[index], player_label),
    );
    const players_details = await Promise.all(players_details_promises);
    const player_roles_flat = players_details.map(
      (player_detail) => player_detail.role,
    );
    const player_codes_flat = players_details.map(
      (player_detail) => player_detail.code_id,
    );
    console.debug("players_roles_flat: ", player_roles_flat);
    console.debug("players_codes_flat: ", player_codes_flat);
    if (player_codes_flat.some((player_code) => !player_code)) {
      return res.status(403).send("403 Forbidden: Team player not assigned");
    }

    const players_labels_cum = players_labels
      .map((player_labels) => player_labels.length)
      .reduce((acc, val) => {
        acc.push(val + (acc.length > 0 ? acc[acc.length - 1] : 0));
        return acc;
      }, [] as number[]);
    console.debug("players_labels_sum: ", players_labels_cum);
    const players_roles = players_labels_cum.map((player_labels_sum, index) => {
      return player_roles_flat.slice(
        index > 0 ? players_labels_cum[index - 1] : 0,
        player_labels_sum,
      );
    });
    const players_codes = players_labels_cum.map((player_labels_sum, index) => {
      return player_codes_flat.slice(
        index > 0 ? players_labels_cum[index - 1] : 0,
        player_labels_sum,
      );
    });
    console.debug("players_roles: ", players_roles);
    console.debug("players_codes: ", players_codes);

    const code_details_promises = player_codes_flat.map((player_code) =>
      ContHasFunc.get_compile_status(player_code),
    );
    const code_details = await Promise.all(code_details_promises);
    const code_status_flat = code_details.map((code) => code.compile_status);
    const code_languages_flat = code_details.map((code) => code.language);
    console.debug("code_status_flat: ", code_status_flat);
    console.debug("code_languages_flat: ", code_languages_flat);
    if (
      code_status_flat.some(
        (status) => status !== "Completed" && status !== "No Need",
      )
    ) {
      return res.status(403).send("403 Forbidden: Team code not compiled");
    }
    if (
      code_languages_flat.some(
        (language) => language !== "py" && language !== "cpp",
      )
    ) {
      return res
        .status(403)
        .send("403 Forbidden: Team code language not supported");
    }

    console.log("Dependencies checked!");

    res.status(200).send("200 OK: Dependencies checked!");

    const base_directory = await utils.get_base_directory();

    const mkdir_promises = team_ids.map((team_id) => {
      return fs
        .mkdir(`${base_directory}/${contest_name}/code/${team_id}/source`, {
          recursive: true,
        })
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Mkdir ${team_id} failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const mkdir_result = await Promise.all(mkdir_promises);
    console.debug("mkdir_result: ", mkdir_result);
    if (mkdir_result.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Code directory creation failed");
      return;
    }

    const files_exist_promises = player_codes_flat.map((player_code, index) => {
      const language = code_languages_flat[index];
      const code_file_name =
        language === "cpp" ? `${player_code}` : `${player_code}.py`;
      return fs
        .access(
          `${base_directory}/${contest_name}/code/${team_ids_flat[index]}/source/${code_file_name}`,
        )
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    });
    const files_exist_flat = await Promise.all(files_exist_promises);
    console.debug("files_exist: ", files_exist_flat);

    const player_codes_flat_unique = Array.from(new Set(player_codes_flat));
    const index_map = player_codes_flat_unique.map((player_code) =>
      player_codes_flat.indexOf(player_code),
    );
    console.debug("player_codes_flat_unique: ", player_codes_flat_unique);
    console.debug("index_map: ", index_map);

    if (files_exist_flat.some((file_exist) => !file_exist)) {
      const cos = await COS.initCOS();
      const config = await COS.getConfig();
      const download_promises = player_codes_flat_unique.map(
        (player_code, index) => {
          if (files_exist_flat[index_map[index]]) {
            return Promise.resolve(true);
          }
          const language = code_languages_flat[index_map[index]];
          const code_file_name =
            language === "cpp" ? `${player_code}` : `${player_code}.py`;
          console.debug("code_file_name: ", code_file_name);
          return fs
            .mkdir(
              `${base_directory}/${contest_name}/code/${team_ids_flat[index_map[index]]}/source`,
              { recursive: true },
            )
            .then(() => {
              return COS.downloadObject(
                `${contest_name}/code/${team_ids_flat[index_map[index]]}/${code_file_name}`,
                `${base_directory}/${contest_name}/code/${team_ids_flat[index_map[index]]}/source/${code_file_name}`,
                cos,
                config,
              );
            })
            .then(() => {
              return fs.chmod(
                `${base_directory}/${contest_name}/code/${team_ids_flat[index_map[index]]}/source/${code_file_name}`,
                0o755,
              );
            })
            .then(() => {
              return Promise.resolve(true);
            })
            .catch((err) => {
              console.log(`Download ${code_file_name} failed: ${err}`);
              return Promise.resolve(false);
            });
        },
      );
      const download_results_flat = await Promise.all(download_promises);
      console.debug("download_results: ", download_results_flat);
      if (download_results_flat.some((result) => !result)) {
        // return res.status(500).send("500 Internal Server Error: Code download failed");
        return;
      }
    }

    console.log("Files downloaded!");

    const map_files_count = await fs
      .readdir(`${base_directory}/${contest_name}/map/${map_id}`)
      .then((files) => {
        return files.length;
      })
      .catch((err) => {
        console.log(`Read ${map_id} files failed: ${err}`);
        return -1;
      });
    console.debug("map_files_count: ", map_files_count);

    if (map_files_count > 1) {
      await utils.deleteAllFilesInDir(
        `${base_directory}/${contest_name}/map/${map_id}`,
      );
    }
    if (map_files_count !== 1) {
      const map_filename = await ContHasFunc.get_map_name(map_id);
      await fs.mkdir(`${base_directory}/${contest_name}/map/${map_id}`, {
        recursive: true,
      });
      const cos = await COS.initCOS();
      const config = await COS.getConfig();
      await COS.downloadObject(
        `${contest_name}/map/${map_filename}`,
        `${base_directory}/${contest_name}/map/${map_id}/${map_id}.txt`,
        cos,
        config,
      ).catch((err) => {
        console.log(`Download ${map_id}.txt failed: ${err}`);
        // return res.status(500).send("500 Internal Server Error: Map download failed");
        return;
      });
    }

    console.log("Map downloaded!");

    const team_room_id_promises = team_ids.map((team_id, index) => {
      return ContHasFunc.get_room_id(team_id, team_labels[index], round_id)
        .then((room_id: string[] | null) => {
          return room_id ? Array.from(new Set(room_id)) : [];
        })
        .catch((err: any) => {
          console.log(`Get room id failed: ${err}`);
          return [];
        });
    });
    const team_room_ids: string[][] = await Promise.all(team_room_id_promises);
    console.debug("team_room_ids: ", team_room_ids);

    const room_id_counts = new Map<string, number>();
    team_room_ids.forEach((team_rooms) => {
      team_rooms.forEach((room_id) => {
        const count = room_id_counts.get(room_id) || 0;
        room_id_counts.set(room_id, count + 1);
      });
    });
    console.debug("room_id_counts: ", room_id_counts);
    const common_room_ids = Array.from(room_id_counts)
      .filter(([, count]) => count === team_ids.length)
      .map(([roomId]) => roomId);
    console.debug("common_room_ids: ", common_room_ids);

    const cos = await COS.initCOS();
    const config = await COS.getConfig();
    const delete_room_promises = common_room_ids.map((room_id) => {
      return ContHasFunc.delete_room(room_id)
        .then((affected_rows: number) => {
          if (affected_rows !== 1) {
            return Promise.resolve(false);
          }
          return ContHasFunc.delete_room_team(room_id);
        })
        .then((affected_rows: number) => {
          if (affected_rows !== team_ids.length) {
            return Promise.resolve(false);
          }
        })
        .then(() => {
          return COS.deleteFolder(
            `${contest_name}/competition/${round_id}/${room_id}`,
            cos,
            config,
          );
        })
        .catch((err: any) => {
          console.log(`Delete room failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const delete_results = await Promise.all(delete_room_promises);
    console.debug("delete_results: ", delete_results);
    if (delete_results.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Room delete failed");
      return;
    }

    const room_id = await ContHasFunc.insert_room_competition(
      contest_id,
      "Waiting",
      map_id,
      round_id,
    );
    console.debug("room_id: ", room_id);
    if (!room_id) {
      // return res.status(500).send("500 Internal Server Error: Room not created");
      return;
    }

    const insert_room_teams_affected_rows = await ContHasFunc.insert_room_teams(
      room_id,
      team_ids,
      team_labels,
      players_roles,
      players_codes,
    );
    if (insert_room_teams_affected_rows !== team_ids.length) {
      // return res.status(500).send("500 Internal Server Error: Room teams not created");
      return;
    }

    console.log("Room created!");

    const copy_promises = player_codes_flat.map((player_code, index) => {
      const language = code_languages_flat[index];
      const code_file_name =
        language === "cpp" ? `${player_code}` : `${player_code}.py`;
      const competition_file_name =
        language === "cpp"
          ? `${player_labels_flat[index]}`
          : `${player_labels_flat[index]}.py`;
      return fs
        .mkdir(
          `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}`,
          { recursive: true },
        )
        .then(() => {
          // return fs.copyFile(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
          // `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}/${competition_file_name}`)
          return fs.symlink(
            `${base_directory}/${contest_name}/code/${team_ids_flat[index]}/source/${code_file_name}`,
            `${base_directory}/${contest_name}/competition/${room_id}/source/${team_ids_flat[index]}/${competition_file_name}`,
          );
        })
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Copy ${code_file_name} failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const copy_result = await Promise.all(copy_promises);
    console.debug("copy_result: ", copy_result);
    if (copy_result.some((result) => !result)) {
      // return res.status(500).send("500 Internal Server Error: Code copy failed");
      return;
    }

    console.log("Files copied!");

    docker_queue.push({
      contest_id: contest_id,
      round_id: round_id,
      room_id: room_id,
      map_id: map_id,
      team_label_binds: team_label_binds,
      competition: 1,
      exposed: exposed,
      envoy: envoy,
    });

    console.log("Docker pushed!");
    // return res.status(200).send("200 OK: Competition created!");
    return;
  } catch (e) {
    console.error(e);
    // return res.status(500).send("500 Internal Server Error: Unknown error" + e);
    return;
  }
});

/**
 * @param token
 * @param {uuid} team_id
 * @returns {number} score
 */
router.post("/get-score", async (req, res) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as ContConf.JwtServerPayload;
      const round_id = payload.round_id!;
      const team_label_binds = payload.team_label_binds;
      const team_ids = team_label_binds.map(
        (team_label_bind) => team_label_bind.team_id,
      );

      const scores: number[] = [];
      for (const team_id of team_ids) {
        const score = await ContHasFunc.get_team_contest_score(
          team_id,
          round_id,
        );
        scores.push(score);
      }

      console.log("score: ", scores);

      return res.status(200).send({
        status: "Finished",
        scores: scores,
      });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("500 Internal Server Error: Unknown error" + e);
  }
});

/**
 * @param token
 * @param {utils.ContestResult}
 */
router.post("/finish-one", async (req, res) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res
          .status(401)
          .send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as ContConf.JwtServerPayload;
      const room_id = payload.room_id;
      const round_id = payload.round_id!;
      const contest_id = payload.contest_id;
      const team_label_binds = payload.team_label_binds;

      const game_scores: number[] = req.body.scores;
      const game_status: string = req.body.status;
      const player_roles: string[][] = req.body.player_roles;
      const extra: string | string[] = req.body.extra;
      const team_ids = team_label_binds.map(
        (team_label_bind) => team_label_bind.team_id,
      );

      console.log("result: ", game_scores);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (game_status === "Finished") {
        console.debug("room_id: ", room_id);
        console.debug("contest_id: ", contest_id);
        console.debug("team_ids: ", team_ids);

        const update_room_team_score_promises = team_ids.map((team_id, index) =>
          ContHasFunc.update_room_team_score(
            room_id,
            team_id,
            game_scores[index],
          ),
        );
        await Promise.all(update_room_team_score_promises);

        await ContHasFunc.update_room_status(room_id, "Finished");
        console.log("Update room team score!");

        if (!player_roles || player_roles.length === 0) {
          return res
            .status(400)
            .send("400 Bad Request: Player roles cannot be empty");
        }
        await ContHasFunc.update_room_team_player_roles(
          room_id,
          team_ids,
          player_roles,
        );
        console.log("Update room team player roles!");
      } else if (game_status === "Crashed") {
        await ContHasFunc.update_room_status(room_id, "Crashed");
        if (player_roles && player_roles.length > 0) {
          await ContHasFunc.update_room_team_player_roles(
            room_id,
            team_ids,
            player_roles,
          );
          console.log("Update room team player roles!");
        }
      }

      const base_directory = await utils.get_base_directory();
      const contest_name = await ContHasFunc.get_contest_name(contest_id);
      try {
        await fs.access(
          `${base_directory}/${contest_name}/competition/${room_id}/output`,
        );

        try {
          const cos = await COS.initCOS();
          const config = await COS.getConfig();
          const file_name = await fs.readdir(
            `${base_directory}/${contest_name}/competition/${room_id}/output`,
          );
          const upload_file_promises = file_name.map((filename) => {
            console.log("filename: " + filename);
            const key = `${contest_name}/competition/${round_id}/${room_id}/${filename}`;
            const localFilePath = `${base_directory}/${contest_name}/competition/${room_id}/output/${filename}`;
            return COS.uploadObject(localFilePath, key, cos, config)
              .then(() => {
                return Promise.resolve(true);
              })
              .catch((err) => {
                console.log(`Upload ${filename} failed: ${err}`);
                return Promise.resolve(false);
              });
          });
          const upload_file = await Promise.all(upload_file_promises);
          if (upload_file.some((result) => !result)) {
            return res
              .status(500)
              .send("500 Internal Server Error: File upload failed");
          }
          console.log("Files uploaded!");

          if (
            extra &&
            ((typeof extra === "string" && extra.trim() !== "") ||
              (Array.isArray(extra) && extra.length > 0))
          ) {
            const extraArray = Array.isArray(extra) ? extra : [extra];
            const extraUploadPromises = extraArray.map((content, index) => {
              const extraFileName = `extra${index + 1}.txt`;
              const localFilePath = `${base_directory}/${contest_name}/competition/${room_id}/output/${extraFileName}`;
              const key = `${contest_name}/competition/${round_id}/${room_id}/${extraFileName}`;
              return fs
                .writeFile(localFilePath, content)
                .then(() => COS.uploadObject(localFilePath, key, cos, config))
                .then(() => {
                  console.log(`Uploaded ${extraFileName} to COS`);
                  return true;
                })
                .catch((err) => {
                  console.log(`Upload ${extraFileName} failed: ${err}`);
                  return false;
                });
            });
            const extraUploadResults = await Promise.all(extraUploadPromises);
            if (extraUploadResults.some((result) => !result)) {
              return res
                .status(500)
                .send("500 Internal Server Error: Extra file upload failed");
            }
            console.log("Extra files uploaded!");
          }
        } catch (err) {
          return res
            .status(500)
            .send("500 Internal Server Error: Delete files failed. " + err);
        }
      } catch (err) {
        console.log("No output files found!");
      } finally {
        const dir_to_remove = `${base_directory}/${contest_name}/competition/${room_id}`;
        console.log("dir_to_remove: ", dir_to_remove);
        if (await utils.checkPathExists(dir_to_remove)) {
          await utils.deleteAllFilesInDir(dir_to_remove);
          console.log(`Directory deleted: ${dir_to_remove}`);
        } else {
          console.log(
            `Directory not found, skipped deletion: ${dir_to_remove}`,
          );
        }
      }

      return res.status(200).send("200 OK: Update OK!");
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("500 Internal Server Error: Unknown error" + e);
  }
});

/**
 * @param {uuid} room_id
 * 用于获取回放的路由，直接返回文件。
 */
router.get("/playback/:room_id", async (req, res) => {
  try {
    const room_id = req.params.room_id;

    const { contest_name, round_id } = await ContHasFunc.get_room_info(room_id);
    const base_directory = await utils.get_base_directory();
    const playbackLocalPath = `${base_directory}/temp/${room_id}/playback.thuaipb`;
    const playbackCOSPath = `${contest_name}/competition/${round_id}/${room_id}/playback.thuaipb`;

    const cos = await COS.initCOS();
    const config = await COS.getConfig();
    await fs.mkdir(`${base_directory}/temp/${room_id}`, { recursive: true });
    await COS.downloadObject(playbackCOSPath, playbackLocalPath, cos, config);

    res.setHeader(
      "Content-Disposition",
      "attachment;filename=playback.thuaipb",
    );
    res.status(200).sendFile(playbackLocalPath, () => {
      utils.deleteAllFilesInDir(`${base_directory}/temp/${room_id}`);
    });
  } catch (err) {
    console.log(err);
    return res.status(404).send("404 Not Found: Playback not found");
  }
});

export default router;
