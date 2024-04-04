import express from "express";
import { docker_queue } from "..";
import jwt from "jsonwebtoken";
import * as fs from "fs/promises";
import * as utils from "../helpers/utils";
import authenticate, { JwtServerPayload } from "../middlewares/authenticate";
import * as hasura from "../helpers/hasura"


const router = express.Router();

/**
 * @param token
 * @param {string} round_id
 */
router.post("/start-all", authenticate(), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const round_id = req.body.round_id;
    console.debug("user_uuid: ", user_uuid);
    console.debug("round_id: ", round_id);
    if (!user_uuid || !round_id) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }

    const { contest_id, map_id } = await hasura.get_round_info(round_id);
    const contest_name = await hasura.get_contest_name(contest_id);

    const is_manager = await hasura.get_maneger_from_user(user_uuid, contest_id);
    console.debug("is_manager: ", is_manager);
    if (!is_manager) {
      return res.status(403).send("403 Forbidden: Not a manager");
    }

    const { team_labels, players_labels }: { team_labels: string[], players_labels: string[] } = await hasura.get_contest_players(contest_id);
    const team_labels_unique = Array.from(new Set(team_labels));
    console.debug("team_labels: ", team_labels);
    console.debug("players_labels: ", players_labels);

    const team_list: string[] = await hasura.get_all_teams(contest_id);
    const team_player_list: { team_id: string, team_label: string, player_label: string }[] = [];
    team_list.forEach((team_id) => {
      players_labels.forEach((player_label, index) => {
        team_player_list.push({ team_id, team_label: team_labels[index], player_label });
      });
    });
    console.debug("team_list: ", team_list);
    console.debug("team_players_list: ", team_player_list);

    const code_role_promises = team_player_list.map(team_player =>
      hasura.get_player_code(team_player.team_id, team_player.player_label)
    );
    const code_role_list: { code_id: string, role: string }[] = await Promise.all(code_role_promises);
    console.debug("code_role_list: ", code_role_list);

    const team_list_filtered: string[] = [];
    const team_player_list_filtered: { team_id: string, team_label: string, player_label: string }[] = [];
    const code_role_list_filtered: { code_id: string, role: string }[] = [];
    for (let i = 0; i < team_player_list.length; i += players_labels.length) {
      if (code_role_list.slice(i, i + players_labels.length).every(player => player.code_id && player.role)) {
        team_list_filtered.push(team_list[i / players_labels.length]);
        team_player_list_filtered.push(...team_player_list.slice(i, i + players_labels.length));
        code_role_list_filtered.push(...code_role_list.slice(i, i + players_labels.length));
      }
    }
    console.debug("team_list_filtered: ", team_list_filtered);
    console.debug("team_players_list_filtered: ", team_player_list_filtered);
    console.debug("code_role_list_filtered: ", code_role_list_filtered);


    const code_detail_promises = code_role_list_filtered.map(player_detail =>
      hasura.get_compile_status(player_detail.code_id)
    );
    const code_detail_list = await Promise.all(code_detail_promises);

    const team_list_available: string[] = [];
    const details_list_available: { team_id: string, team_label: string, player_label: string, code_id: string, role: string, compile_status: string, language: string }[] = [];
    for (let i = 0; i < team_player_list_filtered.length; i += players_labels.length) {
      if (code_detail_list.slice(i, i + players_labels.length).every(code => code.compile_status === "Success" || code.compile_status === "No Need")
          && code_detail_list.slice(i, i + players_labels.length).every(code => code.language === "cpp" || code.language === "py")) {
        team_list_available.push(team_list_filtered[i / players_labels.length]);
        details_list_available.push(...team_player_list_filtered.slice(i, i + players_labels.length).map((player, index) => ({
          team_id: player.team_id,
          team_label: player.team_label,
          player_label: player.player_label,
          code_id: code_role_list_filtered[i + index].code_id,
          role: code_role_list_filtered[i + index].role,
          compile_status: code_detail_list[i + index].compile_status,
          language: code_detail_list[i + index].language
        })));
      }
    }
    console.debug("team_list_available: ", team_list_available);
    console.debug("details_list_available: ", details_list_available);

    console.log("Dependencies checked!");

    const base_directory = await utils.get_base_directory();

    const mkdir_promises = team_list_available.map(team_id => {
      return fs.mkdir(`${base_directory}/${contest_name}/code/${team_id}`, { recursive: true })
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
    if (mkdir_result.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Code directory creation failed");
    }

    console.log("Directories created!");

    const files_exist_promises = details_list_available.map(detail => {
      const language = detail.language;
      const code_file_name = language === "cpp" ? `${detail.code_id}` : `${detail.code_id}.py`;
      return fs.access(`${base_directory}/${contest_name}/code/${detail.team_id}/${code_file_name}`)
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    });
    const files_exist = await Promise.all(files_exist_promises);
    console.debug("files_exist: ", files_exist);

    const player_codes_unique = Array.from(new Set(details_list_available.map(player => player.code_id)));
    const index_map = player_codes_unique.map(player_code => details_list_available.findIndex(player => player.code_id === player_code));
    console.debug("player_codes_unique: ", player_codes_unique);
    console.debug("index_map: ", index_map);

    const cos = await utils.initCOS();
    const config = await utils.getConfig();
    const download_promises = player_codes_unique.map((player_code, index) => {
      if (files_exist[index_map[index]]) {
        return Promise.resolve(true);
      }
      const language = details_list_available[index_map[index]].language;
      const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
      console.debug("code_file_name: ", code_file_name);
      return utils.downloadObject(`${contest_name}/code/${details_list_available[index_map[index]].team_id}/${code_file_name}`,
        `${base_directory}/${contest_name}/code/${details_list_available[index_map[index]].team_id}/${code_file_name}`, cos, config)
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Download ${code_file_name} failed: ${err}`)
          return Promise.resolve(false);
        });
    });
    const download_results = await Promise.all(download_promises);
    console.debug("download_results: ", download_results);
    if (download_results.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Code download failed");
    }

    console.log("Code downloaded!");

    const pairs_unfold: [team_label1: string, team_label2: string, team1: string, team2: string][] = [];
    for (let i = 0; i < team_labels_unique.length; i++) {
        for (let j = i + 1; j < team_labels_unique.length; j++) {
            for (let k = 0; k < team_list_available.length; k++) {
                for (let l = k + 1; l < team_list_available.length; l++) {
                    pairs_unfold.push([team_labels_unique[i], team_labels_unique[j], team_list_available[k], team_list_available[l]]);
                    pairs_unfold.push([team_labels_unique[j], team_labels_unique[i], team_list_available[k], team_list_available[l]]);
                }
            }
        }
    }

    const start_competition_promises = pairs_unfold.map(pair => {
      const team1_label = pair[0];
      const team2_label = pair[1];
      const team1_id = pair[2];
      const team2_id = pair[3];

      const details_list_filtered_1 = details_list_available.filter(player => player.team_id === team1_id && player.team_label === team1_label);
      const details_list_filtered_2 = details_list_available.filter(player => player.team_id === team2_id && player.team_label === team2_label);
      const player_labels_flat = details_list_filtered_1.map(player => player.player_label).concat(
        details_list_filtered_2.map(player => player.player_label));
      const team1_codes = details_list_filtered_1.map(player => player.code_id);
      const team2_codes = details_list_filtered_2.map(player => player.code_id);
      const player_codes_flat = team1_codes.concat(team2_codes);
      const team1_roles = details_list_filtered_1.map(player => player.role);
      const team2_roles = details_list_filtered_2.map(player => player.role);
      const code_languages_flat = details_list_filtered_1.map(player => player.language).concat(
        details_list_filtered_2.map(player => player.language));
      const team_ids_flat = details_list_filtered_1.map(player => player.team_id).concat(
        details_list_filtered_2.map(player => player.team_id));

      let room_id: string;

      return hasura.insert_room_competition(contest_id, "Waiting", map_id, round_id)
      .then((room_id_: string | null) => {
        if (!room_id_) {
          return Promise.resolve(false);
        } else {
          room_id = room_id_;
        }
        console.debug("room_id: ", room_id);
        return hasura.insert_room_teams(room_id, [team1_id, team2_id], [team1_label, team2_label], [team1_roles, team2_roles], [team1_codes, team2_codes])
      })
      .then((affected_rows: number) => {
        if (affected_rows !== 2) {
          return Promise.resolve(false);
        }
        return fs.mkdir(`${base_directory}/${contest_name}/competition/${room_id}/source`, { recursive: true })
      })
      .then(() => {
        const copy_promises = player_codes_flat.map((player_code, index) => {
          const language = code_languages_flat[index];
          const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
          const competition_file_name = language === "cpp" ? `${player_labels_flat[index]}` : `${player_labels_flat[index]}.py`;
          return fs.copyFile(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
            `${base_directory}/${contest_name}/competition/${room_id}/source/${competition_file_name}`)
            .then(() => {
              return Promise.resolve(true);
            })
            .catch((err) => {
              console.log(`Copy ${code_file_name} failed: ${err}`);
              return Promise.resolve(false);
            })
        });
        return Promise.all(copy_promises)
      })
      .then((copy_result: boolean[]) => {
        console.debug("copy_result: ", copy_result);
        if (copy_result.some(result => !result)) {
          return Promise.resolve(false);
        }
        docker_queue.push({
          contest_id: contest_id,
          round_id: round_id,
          room_id: room_id,
          map_id: map_id,
          team_label_binds: [
            { team_id: team1_id, label: team1_label },
            { team_id: team2_id, label: team2_label }
          ],
          competition: 1,
          exposed: 0
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
    if (start_results.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Competition start failed");
    }

    console.log("Competitions started!");

    return res.status(200).send("200 OK: Competition Created!");

  } catch (err) {
    console.error(err);
    return res.status(500).send("500 Internal Server Error: " + err);
  }

});



/**
 * @param token
 * @param {string} round_id
 * @param {utils.TeamLabelBind[]} team_labels
 */
router.post("/start-one", authenticate(), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const team_label_binds: utils.TeamLabelBind[] = req.body.team_labels;
    const round_id = req.body.round_id;
    console.debug("user_uuid: ", user_uuid);
    console.debug("round_id: ", round_id);
    console.debug("team_labels: ", team_label_binds);

    if (!user_uuid || !round_id || team_label_binds.length < 2) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }

    const { contest_id, map_id } = await hasura.get_round_info(round_id);
    const contest_name = await hasura.get_contest_name(contest_id);
    console.debug("contest_id: ", contest_id);
    console.debug("map_id: ", map_id);
    console.debug("contest_name: ", contest_name);
    if (!contest_id || !map_id || !contest_name) {
      return res.status(400).send("400 Bad Request: Contest not found");
    }

    const { team_ids, team_labels } = team_label_binds.reduce((acc, team_label_bind) => {
      acc.team_ids.push(team_label_bind.team_id);
      acc.team_labels.push(team_label_bind.label);
      return acc;
    }, { team_ids: [] as string[], team_labels: [] as string[] });
    console.debug("team_ids: ", team_ids);
    console.debug("team_labels: ", team_labels);
    if (new Set(team_labels).size !== team_labels.length) {
      return res.status(422).send("422 Unprocessable Entity: Duplicate team labels");
    }

    const is_manager = await hasura.get_maneger_from_user(user_uuid, contest_id);
    console.debug("is_manager: ", is_manager);
    if (!is_manager) {
      return res.status(403).send("403 Forbidden: Not a manager");
    }

    const players_labels_promises = team_labels.map(team_label =>
      hasura.get_players_label(contest_id, team_label)
      );
    const players_labels: string[][] = await Promise.all(players_labels_promises);
    console.debug("players_labels: ", players_labels);
    if (players_labels.some(player_labels => !player_labels)) {
      return res.status(400).send("400 Bad Request: Players_label not found");
    }

    const player_labels_flat = players_labels.flat();
    const team_ids_flat = team_ids.flatMap((team_id, index) =>
      Array(players_labels[index].length).fill(team_id)
      );
    console.debug("player_labels_flat: ", player_labels_flat);
    console.debug("team_ids_flat: ", team_ids_flat);

    const players_details_promises = player_labels_flat.map((player_label, index) =>
      hasura.get_player_code(team_ids_flat[index], player_label)
      );
    const players_details = await Promise.all(players_details_promises);
    const player_roles_flat = players_details.map(player_detail => player_detail.role);
    const player_codes_flat = players_details.map(player_detail => player_detail.code_id);
    console.debug("players_roles_flat: ", player_roles_flat);
    console.debug("players_codes_flat: ", player_codes_flat);
    if (player_roles_flat.some(player_role => !player_role) || player_codes_flat.some(player_code => !player_code)) {
      return res.status(403).send("403 Forbidden: Team player not assigned");
    }

    const players_labels_cum = players_labels.map(player_labels =>
      player_labels.length).reduce((acc, val) => {
        acc.push(val + (acc.length > 0 ? acc[acc.length - 1] : 0));
        return acc;
      } , [] as number[]);
    console.debug("players_labels_sum: ", players_labels_cum);
    const players_roles = players_labels_cum.map((player_labels_sum, index) => {
      return player_roles_flat.slice(index > 0 ? players_labels_cum[index - 1] : 0, player_labels_sum);
    });
    const players_codes = players_labels_cum.map((player_labels_sum, index) => {
      return player_codes_flat.slice(index > 0 ? players_labels_cum[index - 1] : 0, player_labels_sum);
    });
    console.debug("players_roles: ", players_roles);
    console.debug("players_codes: ", players_codes);

    const code_details_promises = player_codes_flat.map(player_code =>
      hasura.get_compile_status(player_code)
      );
    const code_details = await Promise.all(code_details_promises);
    const code_status_flat = code_details.map(code => code.compile_status);
    const code_languages_flat = code_details.map(code => code.language);
    console.debug("code_status_flat: ", code_status_flat);
    console.debug("code_languages_flat: ", code_languages_flat);
    if (code_status_flat.some(status => status !== "Success" && status !== "No Need")) {
      return res.status(403).send("403 Forbidden: Team code not compiled");
    }
    if (code_languages_flat.some(language => language !== "py" && language !== "cpp")) {
      return res.status(403).send("403 Forbidden: Team code language not supported");
    }

    console.log("Dependencies checked!")

    const base_directory = await utils.get_base_directory();

    const mkdir_promises = team_ids.map(team_id => {
      return fs.mkdir(`${base_directory}/${contest_name}/code/${team_id}`, { recursive: true })
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
    if (mkdir_result.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Code directory creation failed");
    }

    const files_exist_promises = player_codes_flat.map((player_code, index) => {
      const language = code_languages_flat[index];
      const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
      return fs.access(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`)
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
    const index_map = player_codes_flat_unique.map(player_code => player_codes_flat.indexOf(player_code));
    console.debug("player_codes_flat_unique: ", player_codes_flat_unique);
    console.debug("index_map: ", index_map);

    if (files_exist_flat.some(file_exist => !file_exist)) {
      const cos = await utils.initCOS();
      const config = await utils.getConfig();
      const download_promises = player_codes_flat_unique.map((player_code, index) => {
        if (files_exist_flat[index_map[index]]) {
          return Promise.resolve(true);
        }
        const language = code_languages_flat[index_map[index]];
        const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
        console.debug("code_file_name: ", code_file_name);
        return utils.downloadObject(`${contest_name}/code/${team_ids_flat[index_map[index]]}/${code_file_name}`,
          `${base_directory}/${contest_name}/code/${team_ids_flat[index_map[index]]}/${code_file_name}`, cos, config)
          .then(() => {
            return Promise.resolve(true);
          })
          .catch((err) => {
            console.log(`Download ${code_file_name} failed: ${err}`)
            return Promise.resolve(false);
          });
      });
      const download_results_flat = await Promise.all(download_promises);
      console.debug("download_results: ", download_results_flat);
      if (download_results_flat.some(result => !result)) {
        return res.status(500).send("500 Internal Server Error: Code download failed");
      }
    }

    console.log("Files downloaded!")

    const team_room_id_promises = team_ids.map((team_id, index) => {
      return hasura.get_room_id(team_id, team_labels[index], round_id)
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
    team_room_ids.forEach(team_rooms => {
      team_rooms.forEach(room_id => {
        const count = room_id_counts.get(room_id) || 0;
        room_id_counts.set(room_id, count + 1);
      });
    });
    console.debug("room_id_counts: ", room_id_counts);
    const common_room_ids = Array.from(room_id_counts).filter(([, count]) =>
      count === team_ids.length).map(([roomId, ]) => roomId);
    console.debug("common_room_ids: ", common_room_ids);

    const cos = await utils.initCOS();
    const config = await utils.getConfig();
    const delete_room_promises = common_room_ids.map(room_id => {
      return hasura.delete_room(room_id)
        .then((affected_rows: number) => {
          if (affected_rows !== 1) {
            return Promise.resolve(false);
          }
          return hasura.delete_room_team(room_id);
        })
        .then((affected_rows: number) => {
          if (affected_rows !== team_ids.length) {
            return Promise.resolve(false);
          }
        })
        .then(() => {
          return utils.deleteFolder(`${contest_name}/competition/${round_id}/${room_id}`, cos, config);
        })
        .catch((err: any) => {
          console.log(`Delete room failed: ${err}`);
          return Promise.resolve(false);
        });
    });
    const delete_results = await Promise.all(delete_room_promises);
    console.debug("delete_results: ", delete_results);
    if (delete_results.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Room delete failed");
    }

    const room_id = await hasura.insert_room_competition(contest_id, "Waiting", map_id, round_id);
    console.debug("room_id: ", room_id);
    if (!room_id) {
      return res.status(500).send("500 Internal Server Error: Room not created");
    }

    const insert_room_teams_affected_rows = await hasura.insert_room_teams(room_id, team_ids, team_labels, players_roles, players_codes);
    if (insert_room_teams_affected_rows !== team_ids.length) {
      return res.status(500).send("500 Internal Server Error: Room teams not created");
    }

    console.log("Room created!")

    await fs.mkdir(`${base_directory}/${contest_name}/competition/${room_id}/source`, { recursive: true });
    const copy_promises = player_codes_flat.map((player_code, index) => {
      const language = code_languages_flat[index];
      const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
      const arena_file_name = language === "cpp" ? `${player_labels_flat[index]}` : `${player_labels_flat[index]}.py`;
      return fs.copyFile(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
        `${base_directory}/${contest_name}/competition/${room_id}/source/${arena_file_name}`)
        .then(() => {
          return Promise.resolve(true);
        })
        .catch((err) => {
          console.log(`Copy ${code_file_name} failed: ${err}`);
          return Promise.resolve(false);
        })
    });
    const copy_result = await Promise.all(copy_promises);
    console.debug("copy_result: ", copy_result);
    if (copy_result.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Code copy failed");
    }

    console.log("Files copied!")

    docker_queue.push({
      contest_id: contest_id,
      round_id: round_id,
      room_id: room_id,
      map_id: map_id,
      team_label_binds: team_label_binds,
      competition: 1,
      exposed: 0
    });

    console.log("Docker pushed!")
    return res.status(200).send("200 OK: Competition created!");

  } catch (e) {
    console.error(e);
    return res.status(500).send("500 Internal Server Error: Unknown error" + e);
  }
});




/**
 * @param token
 * @param {uuid} team_id
 * @returns {number} score
 */
router.post("/get-score", async (req, res) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    return res.status(401).send("401 Unauthorized: Missing token");
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).send("401 Unauthorized: Token expired or invalid");
    }
    const team_id = req.body.team_id;
    const score = await hasura.get_team_contest_score(team_id);
    console.debug("score: ", score);

    return res.status(200).send(score.toString());
  });
});

/**
 * @param token
 * @param {utils.ContestResult[]} result
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
        return res.status(401).send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as JwtServerPayload;
      const room_id = payload.room_id;
      const round_id = payload.round_id!;
      const contest_id = payload.contest_id;

      const result: utils.ContestResult[] = req.body.result;
      const team_ids = Array.from(new Set(result.map(result => result.team_id)));
      const update_scores = team_ids.map(team_id => {
        return result.filter(result => result.team_id === team_id).reduce((acc, val) => acc + val.score, 0);
      });

      console.debug("room_id: ", room_id);
      console.debug("contest_id: ", contest_id);
      console.debug("team_ids: ", team_ids);
      console.debug("update_scores: ", update_scores);

      const update_room_team_score_promises = team_ids.map((team_id, index) =>
        hasura.update_room_team_score(room_id, team_id, update_scores[index]));
      await Promise.all(update_room_team_score_promises);

      await hasura.update_room_status(room_id, "Finished", null);
      console.log("Update room team score!")

      const origin_result: utils.ContestResult[] = await hasura.get_teams_contest_score(team_ids);
      console.debug("origin_result: ", origin_result);
      const new_resullt: utils.ContestResult[] = origin_result.map(origin => {
        const update_index = team_ids.indexOf(origin.team_id);
        return {
          team_id: origin.team_id,
          score: update_scores[update_index] + origin.score
        };
      });
      console.debug("new_result: ", new_resullt);
      const update_team_score_promises = new_resullt.map(result => {
        return hasura.update_team_contest_score(result.team_id, result.score);
      });
      await Promise.all(update_team_score_promises);
      console.log("Update team score!")

      const base_directory = await utils.get_base_directory();
      const contest_name = await hasura.get_contest_name(contest_id);
      const cos = await utils.initCOS();
      const config = await utils.getConfig();
      const file_name = await fs.readdir(`${base_directory}/${contest_name}/competition/${room_id}/output`);
      const upload_file_promises = file_name.map(filename => {
        const key = `${contest_name}/competition/${round_id}/${room_id}/${filename}`;
        const localFilePath = `${base_directory}/${contest_name}/competition/${room_id}/output/${filename}`;
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
        return res.status(500).send("500 Internal Server Error: File upload failed");
      }

      console.log("Files uploaded!")

      try {
        await utils.deleteAllFilesInDir(`${base_directory}/${contest_name}/competition/${room_id}`);
      } catch (err) {
        return res.status(500).send("500 Internal Server Error: Delete files failed. " + err);
      }

      return res.status(200).send("200 OK: Update OK!");
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("500 Internal Server Error: Unknown error" + e);
  }
});


export default router;
