import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import { docker_queue } from "..";
import jwt from "jsonwebtoken";
// import { JwtUserPayload } from "../middlewares/authenticate";
import * as fs from "fs/promises";
import * as utils from "../helpers/utils";
import authenticate, { JwtArenaPayload } from "../middlewares/authenticate";
import * as hasura from "../helpers/hasura"
import { v4 as uuidv4 } from 'uuid';
import getSTS from "../helpers/sts";
import COS from "cos-nodejs-sdk-v5";
import fStream from 'fs';


const router = express.Router();


/**
 * @param token
 * @param {string} contest_name
 * @param {uuid} map_id
 * @param {TeamLabelBind[]} team_labels
 */

//// 鉴权。检查登录状态
//// 检查contest表中的arena_switch是否为true
//// 检查用户是否在队伍中，或者是管理员
//// 后端也要检查，限制一支队伍的开战频率。
//// 后端也要检查数据库上的代码编译状态和角色代码分配状态，都正常的情况下再继续下一步。


router.post("/create", authenticate(), async (req, res) => {
  const user_uuid = req.auth.user.uuid;
  const contest_name = req.body.contest_name;
  const map_id = req.body.map_id;
  const team_label_binds: utils.TeamLabelBind[] = req.body.team_labels;

  console.log("user_uuid: ", user_uuid);
  console.log("contest_name: ", contest_name);
  console.log("map_id: ", map_id);
  console.log("team_labels: ", team_label_binds);
  if (!contest_name || !team_label_binds || !map_id || !user_uuid || team_label_binds.length < 2) {
    return res.status(422).send("422 Unprocessable Entity: Missing credentials");
  }

  const { team_ids, team_labels } = team_label_binds.reduce((acc, team_label_bind) => {
    acc.team_ids.push(team_label_bind.team_id);
    acc.team_labels.push(team_label_bind.label);
    return acc;
  }, { team_ids: [] as string[], team_labels: [] as string[] });
  console.log("team_ids: ", team_ids);
  console.log("team_labels: ", team_labels);
  if (new Set(team_labels).size !== team_labels.length) {
    return res.status(422).send("422 Unprocessable Entity: Duplicate team labels");
  }

  const contest_id = await hasura.get_contest_id(contest_name);
  console.log("contest_id: ", contest_id);
  if (!contest_id) {
    return res.status(400).send("400 Bad Request: Contest not found");
  }

  const arena_switch = await hasura.get_contest_settings(contest_id)?.arena_switch ?? false;
  console.log("arena_switch: ", arena_switch);
  if (!arena_switch) {
    return res.status(403).send("403 Forbidden: Arena is not open");
  }

  const is_manager = await hasura.get_maneger_from_user(user_uuid, contest_id);
  console.log("is_manager: ", is_manager);
  if (!is_manager) {
    const user_team_id = await hasura.get_team_from_user(user_uuid, contest_id);
    console.log("user_team_id: ", user_team_id);
    if (!user_team_id) {
      return res.status(403).send("403 Forbidden: User not in team");
    } else if (user_team_id !== team_ids[0]) {
      return res.status(403).send("403 Forbidden: User not in team");
    }
  }

  const active_rooms = hasura.count_room_team(contest_id, team_ids[0]);
  console.log("active_rooms: ", active_rooms);
  if (active_rooms > 6) {
    return res.status(423).send("423 Locked: Request arena too frequently");
  }

  const players_labels_promises = team_labels.map(team_label => hasura.get_players_label(contest_id, team_label));
  const players_labels: Array<Array<string>> = await Promise.all(players_labels_promises);
  console.log("players_labels: ", players_labels);
  if (players_labels.some(player_labels => !player_labels)) {
    return res.status(400).send("400 Bad Request: Players_label not found");
  }

  const player_labels_flat = players_labels.flat();
  const team_ids_flat = team_ids.flatMap((team_id, index) => Array(players_labels[index].length).fill(team_id));
  // const team_labels_flat = team_labels.flatMap((team_label, index) => Array(players_labels[index].length).fill(team_label));


  const player_roles_flat: Array<string> = [], player_codes_flat: Array<string> = [];
  const players_details_promises = player_labels_flat.map((player_label, index) =>
    hasura.get_player_code(team_ids_flat[index], player_label));
  const players_details = await Promise.all(players_details_promises);
  players_details.forEach(player_detail => {
    player_roles_flat.push(player_detail.role);
    player_codes_flat.push(player_detail.code_id);
  });
  console.log("players_roles_flat: ", player_roles_flat);
  console.log("players_codes_flat: ", player_codes_flat);
  if (player_roles_flat.some(player_role => !player_role) || player_codes_flat.some(player_code => !player_code)) {
    return res.status(403).send("403 Forbidden: Team player not assigned");
  }

  const players_labels_cum = players_labels.map(player_labels => player_labels.length).reduce((acc, val) => {
    acc.push(val + (acc.length > 0 ? acc[acc.length - 1] : 0));
    return acc;
  } , [] as number[]);
  console.log("players_labels_sum: ", players_labels_cum);
  const players_roles = players_labels_cum.map((player_labels_sum, index) => {
    return player_roles_flat.slice(index > 0 ? players_labels_cum[index - 1] : 0, player_labels_sum);
  });
  const players_codes = players_labels_cum.map((player_labels_sum, index) => {
    return player_codes_flat.slice(index > 0 ? players_labels_cum[index - 1] : 0, player_labels_sum);
  });
  console.log("players_roles: ", players_roles);
  console.log("players_codes: ", players_codes);

  const code_status_flat: Array<string> = [], code_languages_flat: Array<string> = [];
  const code_details_promises = player_codes_flat.map(player_code => hasura.get_compile_status(player_code));
  const code_details = await Promise.all(code_details_promises);
  code_details.forEach(code_detail => {
    code_status_flat.push(code_detail.compile_status);
    code_languages_flat.push(code_detail.language);
  });
  console.log("code_status_flat: ", code_status_flat);
  console.log("code_languages_flat: ", code_languages_flat);
  if (code_status_flat.some(status => status !== "Success" && status !== "No Need")) {
    return res.status(403).send("403 Forbidden: Team code not compiled");
  }
  if (code_languages_flat.some(language => language !== "py" && language !== "cpp")) {
    return res.status(403).send("403 Forbidden: Team code language not supported");
  }

  const base_directory = await utils.get_base_directory();

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
  console.log("files_exist: ", files_exist_flat);

  if (files_exist_flat.some(file_exist => !file_exist)) {
    fs.mkdir(`${base_directory}/${contest_name}/code/${team_ids_flat[0]}`, { recursive: true });
    const cos = await utils.initCOS();
    const config = await utils.getConfig();
    const download_promises = player_codes_flat.map((player_code, index) => {
      if (files_exist_flat[index]) {
        return Promise.resolve(true);
      }
      const language = code_languages_flat[index];
      const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
      return utils.downloadObject(`${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
        `${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`, cos, config);
    });
    const download_results_flat = await Promise.all(download_promises);
    console.log("download_results: ", download_results_flat);
    if (download_results_flat.some(result => !result)) {
      return res.status(500).send("500 Internal Server Error: Code download failed");
    }
  }

  const files_count_promises = team_ids.map(team_id => {
    return fs.readdir(`${base_directory}/${contest_name}/code/${team_id}`)
      .then(files => {
        return files.length;
      })
      .catch(() => {
        return 0;
      });
  });
  const files_count = await Promise.all(files_count_promises);
  console.log("files_count: ", files_count);

  const files_clean_promises = team_ids.map((team_id, index) => {
    if (files_count[index] < 18) {
      return Promise.resolve(true);
    }
    return fs.readdir(`${base_directory}/${contest_name}/code/${team_id}`)
      .then(files => {
        const files_stat_promises = files.map(file => {
          return fs.stat(`${base_directory}/${contest_name}/code/${team_id}/${file}`)
            .then(stat => {
              return { file, stat };
            });
        });
        return Promise.all(files_stat_promises);
      })
      .then(files_stat => {
          const files_stat_sorted = files_stat.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());
          const files_stat_filtered = files_stat_sorted.filter(file_stat => {
            return !players_codes[index].includes(file_stat.file.split(".")[0]);
          });

          const files_stat_to_delete = files_stat_filtered.slice(0, files_stat_filtered.length - 6);
          const delete_promises = files_stat_to_delete.map(file_stat => {
            return fs.unlink(`${base_directory}/${contest_name}/code/${team_id}/${file_stat.file}`);
          });
          return Promise.all(delete_promises);
        }
      )
  });
  await Promise.all(files_clean_promises);

  const room_id = hasura.insert_room(contest_id, "Waiting", map_id);
  console.log("room_id: ", room_id);
  if (!room_id) {
    return res.status(500).send("500 Internal Server Error: Room not created");
  }

  const insert_room_teams_affected_rows = await hasura.insert_room_teams(room_id, team_ids, team_labels, players_roles, players_codes);
  if (insert_room_teams_affected_rows !== team_ids.length) {
    return res.status(500).send("500 Internal Server Error: Room teams not created");
  }

  await fs.mkdir(`${base_directory}/${contest_name}/arena/${room_id}`, { recursive: true });
  const copy_promises = player_codes_flat.map((player_code, index) => {
    const language = code_languages_flat[index];
    const code_file_name = language === "cpp" ? `${player_code}` : `${player_code}.py`;
    const arena_file_name = language === "cpp" ? `${player_labels_flat[index]}` : `${player_labels_flat[index]}.py`;
    return fs.copyFile(`${base_directory}/${contest_name}/code/${team_ids_flat[index]}/${code_file_name}`,
      `${base_directory}/${contest_name}/arena/${room_id}/${arena_file_name}`);
  });
  await Promise.all(copy_promises);

  docker_queue.push({
    contest_id: contest_id,
    room_id: room_id,
    map_id: map_id,
    team_label_binds: team_label_binds,
    competition: 0,
    exposed: 1
  });

});



export default router;
