import { gql } from "graphql-request";
import { client } from "..";
import { request } from "express";
import { UniqueDirectiveNamesRule } from "graphql";



/**
  ============================================================================
  ============================ QUERY FUNCTIONS ===============================
  ============================================================================
 */

/**
 * query contest_name from contest_id
 * @param {string} contest_id
 * @returns {string} contest_name
 */
export const get_contest_name: any = async (contest_id: string) => {
  const query_contest_name: any = await client.request(
    gql`
      query get_contest_name($contest_id: uuid!) {
        contest(where: { id: { _eq: $contest_id } }) {
          name
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return query_contest_name.contest[0]?.name ?? null;
};


/**
 * query contest_id from contest_name
 * @param {string} contest_name
 * @returns {string} contest_id
 */
export const get_contest_id: any = async (contest_name: string) => {
  const query_contest_id: any = await client.request(
    gql`
      query get_contest_id($contest_name: String!) {
        contest(where: { name: { _eq: $contest_name } }) {
          id
        }
      }
    `,
    {
      contest_name: contest_name,
    }
  );
  return query_contest_id.contest[0]?.id ?? null;
};


/**
 * query contest settings from contest_id
 * @param {string} contest_id
 * @returns {object} {arena_switch, code_upload_switch, playback_switch, playground_switch, stream_switch, team_switch}
 */
export const get_contest_settings: any = async (contest_id: string) => {
  const query_contest_settings: any = await client.request(
    gql`
      query get_contest_settings($contest_id: uuid!) {
        contest(where: {id: {_eq: $contest_id}}) {
          arena_switch
          code_upload_switch
          playback_switch
          playground_switch
          stream_switch
          team_switch
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );

  return {
    arena_switch: query_contest_settings.contest[0]?.arena_switch ?? false,
    code_upload_switch: query_contest_settings.contest[0]?.code_upload_switch ?? false,
    playback_switch: query_contest_settings.contest[0]?.playback_switch ?? false,
    playground_switch: query_contest_settings.contest[0]?.playground_switch ?? false,
    stream_switch: query_contest_settings.contest[0]?.stream_switch ?? false,
    team_switch: query_contest_settings.contest[0]?.team_switch ?? false,
  };
};


/**
 * query team_id from user_uuid and contest_id
 * @param {string} user_uuid
 * @param {string} contest_id
 * @returns {string} team_id
 */
export const get_team_from_user: any = async (user_uuid: string, contest_id: string) => {
  const query_team_id: any = await client.request(
    gql`
      query get_team_id($user_uuid: uuid!, $contest_id: uuid!) {
        contest_team_member(where: {_and: {contest_team: {contest_id: {_eq: $contest_id}}, user_uuid: {_eq: $user_uuid}}}) {
          team_id
        }
      }
    `,
    {
      user_uuid: user_uuid,
      contest_id: contest_id,
    }
  );
  return query_team_id.contest_team_member[0]?.team_id ?? null;
};


/**
 * query team_id from code_id
 * @param {string} code_id
 * @returns {string} team_id
 */
export const get_team_from_code: any = async (code_id: string) => {
  const query_team_id: any = await client.request(
    gql`
      query get_team_id($code_id: uuid!) {
        contest_team_code(where: {code_id: {_eq: $code_id}}) {
          team_id
        }
      }
    `,
    {
      code_id: code_id,
    }
  );
  return query_team_id.contest_team_code[0]?.team_id ?? null;
};


/**
 * query compile_status from code_id
 * @param {string} code_id
 * @returns {object} {compile_status, language}
 */
export const get_compile_status: any = async (code_id: string) => {
  const query_compile_status: any = await client.request(
    gql`
      query get_compile_status($code_id: uuid!) {
        contest_team_code(where: {code_id: {_eq: $code_id}}) {
          compile_status
          language
        }
      }
    `,
    {
      code_id: code_id,
    }
  );
  return {
    compile_status: query_compile_status.contest_team_code[0]?.compile_status ?? null,
    language: query_compile_status.contest_team_code[0]?.language ?? null
  }
};


/**
 * query contest_score from team_id, contest_id and round_id
 * @param {string} team_id
 * @param {string} contest_id
 * @param {string} round_id
 * @returns {number} score
 */
export const get_team_contest_score: any = async (team_id: string, round_id: string) => {
  const query_contest_score: any = await client.request(
    gql`
      query getTeamScore($team_id: uuid!, $round_id: uuid!) {
        contest_team_by_pk(team_id: $team_id) {
          contest_team_rooms_aggregate(where: {contest_room: {round_id: {_eq: $round_id}}}) {
            aggregate {
              sum {
                score
              }
            }
          }
        }
      }
    `,
    {
      team_id: team_id,
      round_id: round_id
    }
  );
  return query_contest_score?.contest_team_by_pk?.contest_team_rooms_aggregate?.aggregate?.sum?.score ?? 0;
};


/**
 * query arena_score from team_id, contest_id
 * @param {string} team_id
 * @param {string} contest_id
 * @returns {number} score
 */
export const get_team_arena_score: any = async (team_id: string) => {
  console.log(team_id);
  const query_arena_score: any = await client.request(
    gql`
      query getTeamScore($team_id: uuid!) {
        contest_team_by_pk(team_id: $team_id) {
          contest_team_rooms_aggregate(where: {contest_room: {round_id: {_is_null: true}}}) {
            aggregate {
              sum {
                score
              }
            }
          }
        }
      }
    `,
    {
      team_id: team_id,
    }
  );
  return query_arena_score?.contest_team_by_pk?.contest_team_rooms_aggregate?.aggregate?.sum?.score ?? 0;
};


/**
 * query manager_uuid from user_uuid and contest_id
 * @param {string} user_uuid
 * @param {string} contest_id
 * @returns {string} manager_uuid
 */
export const get_maneger_from_user: any = async (user_uuid: string, contest_id: string) => {
  const query_if_manager: any = await client.request(
    gql`
      query query_is_manager($contest_id: uuid!, $user_uuid: uuid!) {
        contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_uuid: {_eq: $user_uuid}}}) {
          user_uuid
        }
      }
    `,
    {
      contest_id: contest_id,
      user_uuid: user_uuid
    }
  );
  return query_if_manager.contest_manager[0]?.user_uuid ?? null;
}

/**
 * get max game time from contest_id in seconds
 * @param {string} contest_id
 * @returns {number} game time
 */
export const get_game_time: any = async (contest_id: string) => {
  const game_time: any = await client.request(
    gql`
      query get_game_time($contest_id: uuid!) {
        contest(where: {id: {_eq: $contest_id}}) {
          game_time
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return game_time.contest[0].game_time ?? null;
}


/**
 * get server docker memory limit from contest_id (in GB)
 * @param {string} contest_id
 * @returns {number} server memory limit (GB)
 */
export const get_server_memory_limit: any = async (contest_id: string) => {
  const server_memory_limit: any = await client.request(
    gql`
      query get_server_memory_limit($contest_id: uuid!) {
        contest(where: {id: {_eq: $contest_id}}) {
          server_memory_limit
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return server_memory_limit.contest[0].server_memory_limit ?? null;
}


/**
 * get client docker memory limit from contest_id (in GB)
 * @param {string} contest_id
 * @returns {number} client memory limit (GB)
 */
export const get_client_memory_limit: any = async (contest_id: string) => {
  const client_memory_limit: any = await client.request(
    gql`
      query get_client_memory_limit($contest_id: uuid!) {
        contest(where: {id: {_eq: $contest_id}}) {
          client_memory_limit
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return client_memory_limit.contest[0].client_memory_limit ?? null;
}


/**
 * query language and contest_id from code_id
 * @param {string} code_id
 * @returns {object} {contest_id, contest_name, team_id, language, compile_status}
 */
export const query_code: any = async (code_id: string) => {
  const query_all_from_code: any = await client.request(
    gql`
      query get_all_from_code($code_id: uuid!) {
        contest_team_code(where: {code_id: {_eq: $code_id}}) {
          team_id
          language
          compile_status
          contest_team {
            contest_id
            contest {
              name
            }
          }
        }
      }
    `,
    {
      code_id: code_id,
    }
  );

  return {
    contest_id: query_all_from_code.contest_team_code[0]?.contest_team?.contest_id ?? null,
    contest_name: query_all_from_code.contest_team_code[0]?.contest_team?.contest?.name ?? null,
    team_id: query_all_from_code.contest_team_code[0]?.team_id ?? null,
    language: query_all_from_code.contest_team_code[0]?.language ?? null,
    compile_status: query_all_from_code.contest_team_code[0]?.compile_status ?? null
  };
}


/**
 * Count the number of active rooms that a team is in
 * @param {string} contest_id
 * @param {string} team_id
 * @returns {number} count
 */
export const count_room_team: any = async (contest_id: string, team_id: string) => {
  const count_room_from_team: any = await client.request(
    gql`
      query count_room($contest_id: uuid!, $team_id: uuid!) {
        contest_room_team_aggregate(where: {_and: {team_id: {_eq: $team_id}, contest_room: {_and: {contest_id: {_eq: $contest_id}, status: {_in: [ "Waiting", "Running" ]}}}}}) {
          aggregate {
            count
          }
        }
      }
    `,
    {
      contest_id: contest_id,
      team_id: team_id
    }
  );

  return count_room_from_team.contest_room_team_aggregate.aggregate.count;
}


/**
 * Get all the exposed ports
 * @returns {[{port}]} [{port}]
 */
export const get_exposed_ports: any = async () => {
  const query_exposed_ports: any = await client.request(
    gql`
      query get_exposed_ports {
        contest_room(where: {port: {_is_null: false}}) {
          port
        }
      }
    `
  );
  const result = query_exposed_ports.contest_room
  return result;
}


/**
 * Get the exposed port by room id
 * @returns {number} port
 */
export const get_exposed_port_by_room: any = async (room_id: string) => {
  const query_exposed_port_by_room: any = await client.request(
    gql`
      query get_exposed_port_by_room($room_id: uuid!) {
        contest_room(where: {room_id: {_eq: $room_id}}) {
          port
        }
      }
    `,
    {
      room_id: room_id
    }
  );
  return query_exposed_port_by_room.contest_room[0]?.port
}


/**
 * query player_label from contest_id and team_label
 * @param {string} contest_id
 * @param {string} team_label
 * @returns {string[]} player_labels
 */
export const get_players_label: any = async (contest_id: string, team_label: string) => {
  const query_players_label: any = await client.request(
    gql`
      query get_players_label($contest_id: uuid!, $team_label: String!) {
        contest_player(where: {_and: {contest_id: {_eq: $contest_id}, team_label: {_eq: $team_label}}}) {
          player_label
        }
      }
    `,
    {
      contest_id: contest_id,
      team_label: team_label
    }
  );

  return query_players_label.contest_player.map((player: any) => player.player_label);
}


/**
 * query code_id and role from team_id and player_label
 * @param {string} team_id
 * @param {string} player_label
 * @returns {object} {code_id, role}
 */
export const get_player_code: any = async (team_id: string, player_label: string) => {
  const query_code_id: any = await client.request(
    gql`
      query get_code_id($team_id: uuid!, $player_label: String!) {
        contest_team_player(where: {_and: {team_id: {_eq: $team_id}, player: {_eq: $player_label}}}) {
          code_id
          role
        }
      }
    `,
    {
      team_id: team_id,
      player_label: player_label
    }
  );

  return {
    code_id: query_code_id.contest_team_player[0]?.code_id ?? null,
    role: query_code_id.contest_team_player[0]?.role ?? null
  }
}


/**
 * query round info from round_id
 * @param {string} round_id
 * @returns {object} {contest_id, map_id}
 */
export const get_round_info: any = async (round_id: string) => {
  const query_round_info: any = await client.request(
    gql`
      query get_round_info($round_id: uuid!) {
        contest_round(where: {round_id: {_eq: $round_id}}) {
          contest_id
          map_id
        }
      }
    `,
    {
      round_id: round_id,
    }
  );

  return {
    contest_id: query_round_info.contest_round[0]?.contest_id ?? null,
    map_id: query_round_info.contest_round[0]?.map_id ?? null
  }
}


/**
 * query contest player info from contest_id
 * @param {string} contest_id
 * @returns {object} {team_labels, players_labels}
 */
export const get_contest_players: any = async (contest_id: string) => {
  const query_players: any = await client.request(
    gql`
      query get_players($contest_id: uuid!) {
        contest_player(where: {contest_id: {_eq: $contest_id}}, order_by: {team_label: asc}) {
          team_label
          player_label
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );

  return {
    team_labels: query_players.contest_player.map((player: any) => player.team_label),
    players_labels: query_players.contest_player.map((player: any) => player.player_label)
  }
}


/**
 * query all team_ids from contest_id
 * @param {string} contest_id
 * @returns {string[]} team_ids
 */
export const get_all_teams: any = async (contest_id: string) => {
  const query_teams: any = await client.request(
    gql`
      query get_teams($contest_id: uuid!) {
        contest_team(where: {contest_id: {_eq: $contest_id}}, order_by: {team_id: asc}) {
          team_id
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );

  return query_teams.contest_team.map((team: any) => team.team_id);
}


/**
 * query room_id from team_id, team_label and round_id
 * @param {string} team_id
 * @param {string} team_label
 * @param {string} round_id
 * @returns {string[]} room_id
 */
export const get_room_id: any = async (team_id: string, team_label: string, round_id: string) => {
  const query_room_id: any = await client.request(
    gql`
      query get_room_id($team_id: uuid!, $team_label: String!, $round_id: uuid!) {
        contest_room_team(where: {_and: {team_id: {_eq: $team_id}, team_label: {_eq: $team_label}, contest_room: {round_id: {_eq: $round_id}}}}) {
          room_id
        }
      }
    `,
    {
      team_id: team_id,
      team_label: team_label,
      round_id: round_id
    }
  );

  return query_room_id.contest_room_team.map((room: any) => room.room_id);
}


/**
 * query all maps
 * @returns {object} {contest_list, map_list}
 */
export const get_all_maps: any = async () => {
  const query_maps: any = await client.request(
    gql`
      query get_maps {
        contest_map(order_by: {contest_id: asc}) {
          contest_id
          map_id
        }
      }
    `
  );

  return {
    contest_list: query_maps.contest_map.map((map: any) => map.contest_id),
    map_list: query_maps.contest_map.map((map: any) => map.map_id)
  }
}


/**
 * get map name
 * @param {string} map_id
 * @returns {string} map_name
 */
export const get_map_name: any = async (map_id: string) => {
  const query_map: any = await client.request(
    gql`
      query get_map_name($map_id: uuid!) {
        contest_map(where: {map_id: {_eq: $map_id}}){
          filename
        }
      }
    `,
    {
      map_id: map_id
    }
  );
  return query_map.contest_map[0].filename ?? null;
}


/**
 * get room_info by room_id
 * @param {uuid} room_id
 * @returns {object} {contest_name, round_id}
 */
export const get_room_info: any = async (room_id: string) => {
  const query_room_info: any = await client.request(
    gql`
      query get_room_info($room_id: uuid!) {
        contest_room(where: {room_id: {_eq: $room_id}}) {
          contest {
            name
          }
          round_id
        }
      }
    `,
    {
      room_id: room_id
    }
  );
  return {
    contest_name: query_room_info.contest_room[0]?.contest?.name ?? null,
    round_id: query_room_info.contest_room[0]?.round_id ?? null
  }
}








































/**
  ============================================================================
  ============================ INSERT FUNCTIONS ==============================
  ============================================================================
 */

/**
 * insert a new room
 * @param {string} contest_id
 * @param {string} status
 * @param {string} map_id
 * @returns {string} room_id
 */
export const insert_room: any = async (contest_id: string, status: string, map_id: string) => {
  const insert_room: any = await client.request(
    gql`
      mutation insert_room($contest_id: uuid!, $status: String!, $map_id: uuid!) {
        insert_contest_room_one(object: {contest_id: $contest_id, status: $status, map_id: $map_id}) {
          room_id
        }
      }
    `,
    {
      contest_id: contest_id,
      status: status,
      map_id: map_id
    }
  );

  return insert_room.insert_contest_room_one?.room_id ?? null;
}


/**
 * insert a new competition room
 * @param {string} contest_id
 * @param {string} status
 * @param {string} map_id
 * @param {string} round_id
 * @returns {string} room_id
 */
export const insert_room_competition: any = async (contest_id: string, status: string, map_id: string, round_id: string) => {
  const insert_room: any = await client.request(
    gql`
      mutation insert_room($contest_id: uuid!, $status: String!, $map_id: uuid!, $round_id: uuid!) {
        insert_contest_room_one(object: {contest_id: $contest_id, status: $status, map_id: $map_id, round_id: $round_id}) {
          room_id
        }
      }
    `,
    {
      contest_id: contest_id,
      status: status,
      map_id: map_id,
      round_id: round_id
    }
  );

  return insert_room.insert_contest_room_one?.room_id ?? null;
}


/**
 * Insert room_teams
 * @param {string} room_id
 * @param {string[]} team_ids
 * @param {string[]} team_labels
 * @param {string[][]} player_roles
 * @param {string[][]} player_codes
 * @returns {number} affected_rows
 */
export const insert_room_teams: any = async (room_id: string, team_ids: Array<string>, team_labels: Array<string>, player_roles: Array<Array<string>>, player_codes: Array<Array<string>>) => {
  const insert_room_teams: any = await client.request(
    gql`
      mutation insert_room_teams($objects: [contest_room_team_insert_input!]!) {
        insert_contest_room_team(objects: $objects) {
          affected_rows
        }
      }
    `,
    {
      objects: team_ids.map((team_id, index) => ({
        room_id,
        team_id,
        team_label: team_labels[index],
        player_roles: JSON.stringify(player_roles[index]),
        player_codes: JSON.stringify(player_codes[index])
      }))
    }
  );

  return insert_room_teams.insert_contest_room_team.affected_rows;
}

/**
 * 添加比赛地图
 * @param {string} contest_id - 比赛ID
 * @param {string} name - 地图名称
 * @param {string} filename - 文件名
 * @param {string} team_labels - 队伍标签
 * @returns {Promise<string>} 地图ID
 */
export const add_contest_map:any = async(contest_id:string, name:string, filename:string, team_labels:string) => {
  const add_contest_map:any = await client.request(
    gql`
    mutation AddContestMap(
      $contest_id: uuid!
      $name: String!
      $filename: String!
      $team_labels: String!
  ) {
    insert_contest_map_one(
      object: {
        contest_id: $contest_id
        name: $name
        filename: $filename
        team_labels: $team_labels
      }
    ) {
      map_id
    }
  }
    `,
    {
      contest_id: contest_id,
      name: name,
      filename: filename,
      team_labels: team_labels
    });
  return add_contest_map.insert_contest_map_one.map_id;
}

/**
 * 添加比赛公告
 * @param {string} title - 公告标题
 * @param {string} content - 公告内容
 * @param {string} files - 附件
 * @param {string} contest_id - 比赛ID
 * @returns {Promise<string>} 公告ID
 */
export const add_contest_notice:any = async(title:string,content:string,files:string,contest_id:string) => {
  const add_contest_notice:any = await client.request(
    gql`
    mutation AddContestNotice(
      $title: String!
      $content: String!
      $files: String
      $contest_id: uuid!
    ) {
      insert_contest_notice_one(
        object: {
          title: $title
          content: $content
          files: $files
          contest_id: $contest_id
        }
      ) {
        id
      }
    }
    `,
    {
      title:title,
      content:content,
      files:files,
      contest_id:contest_id
    }
  )
  return add_contest_notice.insert_contest_notice_one.id;
}

/**
 * 添加比赛选手
 * @param {string} contest_id - 比赛ID
 * @param {string} team_label - 队伍标签
 * @param {string} player_label - 选手标签
 * @param {string} roles_available - 可用角色
 * @returns {Promise<string>} 队伍标签
 */
export const add_contest_player:any = async(contest_id:string,team_label:string,player_label:string,roles_available:string) =>{
  const add_contest_player:any = await client.request(
    gql`
    mutation AddContestPlayer(
      $contest_id: uuid!
      $team_label: String!
      $player_label: String!
      $roles_available: String!
    ) {
      insert_contest_player_one(
        object: {
          contest_id: $contest_id
          team_label: $team_label
          player_label: $player_label
          roles_available: $roles_available
        }
      ) {
        team_label
      }
    }
    `,
    {
      contest_id: contest_id,
      team_label: team_label,
      player_label: player_label,
      roles_available: roles_available
    });
  return add_contest_player.insert_contest_player_one.team_label;
}

/**
 * 添加比赛轮次
 * @param {string} contest_id - 比赛ID
 * @param {string} name - 轮次名称
 * @param {string} map_id - 地图ID
 * @returns {Promise<string>} 轮次ID
 */
export const add_contest_round:any = async(contest_id:string,name:string,map_id:string)=>{
  const add_contest_round:any = await client.request(
    gql`
    mutation AddContestRound($contest_id: uuid!, $name: String!, $map_id: uuid) {
      insert_contest_round_one(
        object: { contest_id: $contest_id, name: $name, map_id: $map_id }
      ) {
        round_id
      }
    }
  `,
  {
    contest_id: contest_id,
    name: name,
    map_id: map_id
  });
  return add_contest_round.insert_contest_round_one.round_id;
}

/**
 * 添加队伍代码
 * @param {string} team_id - 队伍ID
 * @param {string} code_name - 代码名称
 * @param {string} language - 编程语言
 * @param {string} compile_status - 编译状态
 * @returns {Promise<string>} 代码ID
 */
export const add_team_code:any = async(team_id:string,code_name:string,language:string,compile_status:string) =>{
  const add_team_code:any = await client.request(
    gql`
    mutation AddTeamCode(
      $team_id: uuid!
      $code_name: String!
      $language: String!
      $compile_status: String
    ) {
      insert_contest_team_code_one(
        object: {
          team_id: $team_id
          code_name: $code_name
          language: $language
          compile_status: $compile_status
        }
      ) {
        code_id
      }
    }
    `,
    {
      team_id: team_id,
      code_name: code_name,
      compile_status: compile_status,
    });
    return add_team_code.insert_contest_team_code_one.code_id;
  }

/**
 * 添加队伍选手
 * @param {string} team_id - 队伍ID
 * @param {string} player - 选手
 * @returns {Promise<string>} 选手
 */
export const add_team_player:any = async(team_id:string,player:string) =>{
  const add_team_player:any = await client.request(
  gql`
  mutation AddTeamPlayer($team_id: uuid!, $player: String!) {
    insert_contest_team_player_one(
      object: { team_id: $team_id, player: $player }
    ) {
      player
    }
  }
  `,
  {
    team_id:team_id,
    player:player
  });
  return add_team_player.insert_contest_team_player_one.player;
} 

/**
 * 添加队伍
 * @param {string} team_name - 队伍名称
 * @param {string} team_intro - 队伍介绍
 * @param {string} team_leader_uuid - 队长UUID
 * @param {string} invited_code - 邀请码
 * @param {string} contest_id - 比赛ID
 * @returns {Promise<string>} 队伍ID
 */
export const add_team:any = async(team_name:string,team_intro:string,team_leader_uuid:string,invited_code:string,contest_id:string) =>{
  const add_team:any = await client.request(
    gql`
    mutation AddTeam(
      $team_name: String!
      $team_intro: String = "" # 此处的intro可以为NULL
      $team_leader_uuid: uuid! # team_leader的uuid
      $invited_code: String!
      $contest_id: uuid! # 比赛名称是必填的项
    ) {
      insert_contest_team_one(
        object: {
          team_name: $team_name
          team_intro: $team_intro
          team_leader_uuid: $team_leader_uuid
          invited_code: $invited_code
          contest_id: $contest_id
          contest_team_members: { data: { user_uuid: $team_leader_uuid } }
        }
      ) {
        team_id
      }
    }`,
    {
      team_name: team_name,
      team_intro: team_intro,
      team_leader_uuid: team_leader_uuid,
      invited_code: invited_code,
      contest_id: contest_id
    });
    return add_team.insert_contest_team_one.team_id;
  }

/**
 * 添加队伍成员
 * @param {string} team_id - 队伍ID
 * @param {string} user_uuid - 用户UUID
 * @returns {Promise<string>} 队伍ID
 */
export const add_team_member:any = async(team_id:string,user_uuid:string) =>{
  const add_team_member:any = await client.request(
    gql`
    mutation AddTeamMember($team_id: uuid!, $user_uuid: uuid!) {
      insert_contest_team_member_one(
        object: { team_id: $team_id, user_uuid: $user_uuid }
      ) {
        team_id
      }
    }
    `,
    {
      team_id: team_id,
      user_uuid: user_uuid
    });
    return add_team_member.insert_contest_team_member_one.team_id;
  }

/**
 * 添加比赛时间
 * @param {string} contest_id - 比赛ID
 * @param {string} event - 事件
 * @param {string} start - 开始时间
 * @param {string} end - 结束时间
 * @param {string} description - 描述
 * @returns {Promise<string>} 事件
 */
export const add_contest_time:any = async(contest_id:string,event:string,start:string,end:string,description:string) =>{
  const add_contest_time:any = await client.request(
    gql`
    mutation AddContestTime(
      $contest_id: uuid!
      $event: String!
      $start: timestamptz!
      $end: timestamptz!
      $description: String
    ) {
      insert_contest_time_one(
        object: {
          contest_id: $contest_id
          event: $event
          start: $start
          end: $end
          description: $description
        }
      ) {
        event
      }
    }`,
    {
      contest_id: contest_id,
      event: event,
      start: start,
      end: end,
      description: description
    });
    return add_contest_time.insert_contest_time_one.event;
    }





















/**
  ============================================================================
  ============================ UPDATE FUNCTIONS ==============================
  ============================================================================
 */

/**
 * update compile_status
 * @param {string} code_id
 * @param {string} compile_status
 * @returns {number} affected_rows
 */
export const update_compile_status: any = async (code_id: string, compile_status: string) => {
  const update_compile_status: any = await client.request(
    gql`
      mutation update_compile_status($code_id: uuid!, $compile_status: String!) {
        update_contest_team_code(where: {code_id: {_eq: $code_id}}, _set: {compile_status: $compile_status}) {
          affected_rows
        }
      }
    `,
    {
      code_id: code_id,
      compile_status: compile_status,
    }
  );

  return update_compile_status.update_contest_team_code.affected_rows;
}


/**
 * update room status and port
 * @param {string} room_id
 * @param {string} status
 * @param {number} port
 * @returns {number} affected_rows
 */
export const update_room_status_and_port: any = async (room_id: string, status: string, port: number | null) => {
  const update_room_status: any = await client.request(
    gql`
      mutation update_room_status($room_id: uuid!, $status: String!, $port: Int) {
        update_contest_room(where: {room_id: {_eq: $room_id}}, _set: {status: $status, port: $port}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id,
      status: status,
      port: port
    }
  );

  return update_room_status.update_contest_room.affected_rows;
}


/**
 * update room status
 * @param {string} room_id
 * @param {string} status
 * @returns {number} affected_rows
 */
export const update_room_status: any = async (room_id: string, status: string) => {
  const update_room_status: any = await client.request(
    gql`
      mutation update_room_status($room_id: uuid!, $status: String!) {
        update_contest_room(where: {room_id: {_eq: $room_id}}, _set: {status: $status}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id,
      status: status
    }
  );

  return update_room_status.update_contest_room.affected_rows;
}


/**
 * update room port
 * @param {string} room_id
 * @param {number} port
 * @returns {number} affected_rows
 */
export const update_room_port: any = async (room_id: string, port: number | null) => {
  const update_room_status: any = await client.request(
    gql`
      mutation update_room_status($room_id: uuid!, $port: Int) {
        update_contest_room(where: {room_id: {_eq: $room_id}}, _set: {port: $port}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id,
      port: port
    }
  );

  return update_room_status.update_contest_room.affected_rows;
}


/**
 * update room_team score
 * @param {string} room_id
 * @param {string} team_id
 * @param {number} score
 */
export const update_room_team_score: any = async (room_id: string, team_id: string, score: number) => {
  const update_room_team_score: any = await client.request(
    gql`
      mutation update_room_team_score($room_id: uuid!, $team_id: uuid!, $score: Int!) {
        update_contest_room_team(where: {_and: {room_id: {_eq: $room_id}, team_id: {_eq: $team_id}}}, _set: {score: $score}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id,
      team_id: team_id,
      score: score
    }
  );

  return update_room_team_score.update_contest_room_team.affected_rows;
}


/**
 * update room created_at time
 * @param {string} room_id
 * @param {string} created_at
 * @returns {string} created_at
 */
export const update_room_created_at: any = async (room_id: string, created_at: string) => {
  const update_room_created_at: any = await client.request(
    gql`
      mutation update_room_created_at($room_id: uuid!, $created_at: timestamptz = "") {
        update_contest_room_by_pk(pk_columns: {room_id: $room_id}, _set: {created_at: $created_at}) {
          created_at
        }
      }
    `,
    {
      room_id: room_id,
      created_at: created_at
    }
  );

  return update_room_created_at.update_contest_room_by_pk.created_at;
}

export const update_contest_info:any = async(contest_id: string, fullname: string, description: string, start_date: number, end_date: number) => {
  const update_contest_info: any = await client.request(
    gql`
    mutation UpdateContestInfo(
      $contest_id: uuid!
      $fullname: String!
      $description: String
      $start_date: timestamptz!
      $end_date: timestamptz!
    ) {
      update_contest_by_pk(
        pk_columns: { id: $contest_id }
        _set: {
          fullname: $fullname
          description: $description
          start_date: $start_date
          end_date: $end_date
        }
      ) {
         id
      }
    }
    `,
    {
      contest_id: contest_id,
      fullname: fullname,
      description: description,
      start_date: new Date(start_date),
      end_date: new Date(end_date)
    });
  return update_contest_info.update_contest_by_pk.id;
}

export const update_contest_switch:any = async(contest_id: string, team_switch: boolean, code_upload_switch: boolean,arena_switch: boolean, playground_switch: boolean, stream_switch: boolean, playback_switch:boolean) => {
  const update_contest_switch:any = await client.request(
    gql`
    mutation UpdateContestSwitch(
      $contest_id: uuid!
      $team_switch: Boolean!
      $code_upload_switch: Boolean!
      $arena_switch: Boolean!
      $playground_switch: Boolean!
      $stream_switch: Boolean!
      $playback_switch: Boolean!
    ) {
      update_contest_by_pk(
        pk_columns: { id: $contest_id }
        _set: {
          team_switch: $team_switch
          code_upload_switch: $code_upload_switch
          arena_switch: $arena_switch
          playground_switch: $playground_switch
          stream_switch: $stream_switch
          playback_switch: $playback_switch
        }
      ) {
        id
      }
    }
    `,
    {
      contest_id: contest_id,
      team_switch: team_switch,
      code_upload_switch: code_upload_switch,
      arena_switch: arena_switch,
      playground_switch: playground_switch,
      stream_switch: stream_switch,
      playback_switch: playback_switch
    });
  return update_contest_switch.update_contest_by_pk.id;
}

export const update_contest_map:any = async(map_id:string,name:string,filename:string,team_labels:string) => {
  const update_contest_map:any = await client.request(
    gql`
  mutation UpdateContestMap(
    $map_id: uuid!
    $name: String!
    $filename: String!
    $team_labels: String!
  ) {
    update_contest_map_by_pk(
      pk_columns: { map_id: $map_id }
      _set: { name: $name, filename: $filename, team_labels: $team_labels }
    ) {
      map_id
    }
  }
  `,
  {
    map_id: map_id,
    name: name,
    filename: filename,
    team_labels: team_labels
  });
  return update_contest_map.update_contest_map_by_pk.map_id;  
}
  
export const update_contest_notice:any = async(id:string,title:string,content:string,files:string) => {
  const update_contest_notice:any = await client.request(
    gql`
    mutation UpdateContestNotice(
      $id: uuid!
      $title: String!
      $content: String!
      $files: String
    ) {
      update_contest_notice_by_pk(
        pk_columns: { id: $id }
        _set: { title: $title, content: $content, files: $files }
      ) {
        id
      }
    }
    `,
    {
      id:id,
      title:title,
      content:content,
      files:files
    });
  return update_contest_notice.update_contest_notice_by_pk.id;
}

export const update_contest_player:any = async(contest_id:string,team_label:string,player_label:string,roles_available:string) =>{
  const update_contest_player:any = await client.request(
    gql`
  mutation UpdateContestPlayer(
    $contest_id: uuid!
    $team_label: String!
    $player_label: String!
    $roles_available: String!
  ) {
    update_contest_player_by_pk(
      pk_columns: {
        contest_id: $contest_id
        team_label: $team_label
        player_label: $player_label
      }
      _set: { player_label: $player_label, roles_available: $roles_available }
    ) {
      team_label
    }
  }    
    `,
    {
      contest_id: contest_id,
      team_label: team_label,
      player_label: player_label,
      roles_available: roles_available
    });
    return update_contest_player.update_contest_player_by_pk.team_label;
}

export const update_contest_round_name:any = async(round_id:string,name:string) =>{
  const update_contest_round_name:any = await client.request(
    gql`
    mutation UpdateContestRoundName($round_id: uuid!, $name: String!) {
      update_contest_round_by_pk(
        pk_columns: { round_id: $round_id }
        _set: { name: $name }
      ) {
        round_id
      } 
    }
    `,
    {
      round_id: round_id,
      name: name
    });
    return update_contest_round_name.update_contest_round_by_pk.round_id;
}

export const update_team_code_name:any = async(code_id:string,code_name:string)=>{
  const update_team_code_name:any = await client.request(
    gql`
    mutation UpdateTeamCodeName($code_id: uuid!, $code_name: String!) {
      update_contest_team_code_by_pk(
        pk_columns: { code_id: $code_id }
        _set: { code_name: $code_name }
      ) {
        code_id
      }
    }
    `,
    {
      code_id: code_id,
      code_name: code_name
    });
    return update_team_code_name.update_contest_team_code_by_pk.code_id;
}

export const update_team_player:any = async(team_id:string,player:string,code_id:string,role:string) =>{
  const update_team_player:any = await client.request(
    gql`
    mutation UpdateTeamPlayer(
      $team_id: uuid!
      $player: String!
      $code_id: uuid
      $role: String
    ) {
      update_contest_team_player_by_pk(
        pk_columns: { team_id: $team_id, player: $player }
        _set: { code_id: $code_id, role: $role }
      ) {
        player
      }
    }
    `,
    {
      team_id: team_id,
      player: player,
      code_id: code_id,
      role: role
    });
    return update_team_player.update_contest_team_player_by_pk.player;
  }

export const update_team:any = async(team_id:string,team_name:string,team_intro:string) =>{
  const update_team:any = await client.request(
    gql`
    mutation UpdateTeam(
      $team_id: uuid!
      $team_name: String!
      $team_intro: String!    
    ) {
      update_contest_team_by_pk(
        pk_columns: { team_id: $team_id }
        _set: { team_name: $team_name, team_intro: $team_intro }
      ) {
        team_id
      }
    }
    `,
    {
      team_id: team_id,
      team_name: team_name,
      team_intro: team_intro
    });
    return update_team.update_contest_team_by_pk.team_id;
  }

export const update_contest_time:any = async(contest_id:string,event:string,start:string,end:string,description:string) =>{
  const update_contest_time:any = await client.request(
    gql`
    mutation UpdateContestTime(
      $contest_id: uuid!
      $event: String!
      $start: timestamptz!
      $end: timestamptz!
      $description: String
    ) {
      update_contest_time_by_pk(
        pk_columns: { contest_id: $contest_id, event: $event }
        _set: { start: $start, end: $end, description: $description }
      ) {
        event
      }
    }
    `,
    {
      contest_id: contest_id,
      event: event,
      start: start,
      end: end,
      description: description
    });
    return update_contest_time.update_contest_time_by_pk.event;
  }






















/**
  ============================================================================
  ============================ DELETE FUNCTIONS ==============================
  ============================================================================
 */


/**
 * delete contest room
 * @param {string} room_id
 * @returns {number} affected_rows
 */
export const delete_room: any = async (room_id: string) => {
  const delete_room: any = await client.request(
    gql`
      mutation delete_room($room_id: uuid!) {
        delete_contest_room(where: {room_id: {_eq: $room_id}}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id
    }
  );

  return delete_room.delete_contest_room.affected_rows;
}


/**
 * delete contest room team
 * @param {string} room_id
 * @returns {number} affected_rows
 */
export const delete_room_team: any = async (room_id: string) => {
  const delete_room_team: any = await client.request(
    gql`
      mutation delete_room_team($room_id: uuid!) {
        delete_contest_room_team(where: {room_id: {_eq: $room_id}}) {
          affected_rows
        }
      }
    `,
    {
      room_id: room_id
    }
  );

  return delete_room_team.delete_contest_room_team.affected_rows;
}

export const delete_contest:any = async (contest_id: string) => {
  const delete_contest: any = await client.request(
    gql`
      mutation delete_contest($contest_id: uuid!) {
        delete_contest_by_pk(id: $contest_id) {
          id
        } 
      }
    `,
    {
      contest_id: contest_id
    }
  );

  return delete_contest.delete_contest.affected_rows;
}

export const delete_contest_map:any = async (map_id: string) => {
  const delete_contest_map: any = await client.request(
    gql`
      mutation delete_contest_map($map_id: uuid!) {
        delete_contest_map_by_pk(map_id: $map_id) {
          map_id
        }
      }
    `,
    {
      map_id: map_id
    }
  );

  return delete_contest_map.delete_contest_map_by_pk.map_id;
}

export const delete_contest_notice:any = async(id:string) =>{
  const delete_contest_notice:any = await client.request(
    gql`
    mutation DeleteContestNotice($id: uuid!) {
      delete_contest_notice_by_pk(id: $id) {
        id
      }
    }
    `,
    {
      id:id
    }
  );
  return delete_contest_map.delete_contest_notice_by_pk.id;
}


export const delete_contest_player:any = async(contest_id:string,team_label:string,player_label:string) =>{
  const delete_contest_player:any = await client.request(
    gql`
    mutation DeleteContestPlayer(
      $contest_id: uuid!
      $team_label: String!
      $player_label: String!
    ) {
      delete_contest_player_by_pk(
        contest_id: $contest_id
        team_label: $team_label
        player_label: $player_label
      ) {
        team_label
      }
    }
    `,
    {
      contest_id: contest_id,
      team_label: team_label,
      player_label: player_label
    });
  return delete_contest_player.delete_contest_player_by_pk.team_label;
}

export const delete_contest_round:any = async(round_id:string) => {
  const delete_contest_round:any = await client.request(
    gql`
    mutation DeleteContestRound($round_id: uuid!) {
      delete_contest_round_by_pk(round_id: $round_id) {
        round_id
      }
    }
    `,
    {
      round_id: round_id
    });
  return delete_contest_round.delete_contest_round_by_pk.round_id;
}

export const delete_team_code:any = async(code_id:string)=>{
  const delete_team_code:any = await client.request(
    gql`
    mutation DeleteTeamCode($code_id: uuid!) {
      delete_contest_team_code_by_pk(code_id: $code_id) {
        code_id
      }
    }
    `,
    {
      code_id: code_id

    });
    return delete_team_code.delete_contest_team_code_by_pk.code_id; 
}


export const delete_team:any = async(team_id:string) => {
  const delete_team:any = await client.request(
    gql`
    mutation DeleteTeam($team_id: uuid!) {
      delete_contest_team_by_pk(team_id: $team_id) {
        team_id
      }
    }
    `,
    {
      team_id: team_id
    });
    return delete_team.delete_contest_team_by_pk.team_id;
}

export const delete_team_member:any = async(user_uuid:string,team_id:string) => {
  const delete_team_member:any = await client.request(
    gql`
    mutation DeleteTeamMember($user_uuid: uuid!, $team_id: uuid!) {
      delete_contest_team_member_by_pk(user_uuid: $user_uuid, team_id: $team_id) {
        team_id
      }
    }
    `,
    {
      user_uuid: user_uuid,
      team_id: team_id
    });
    return delete_team_member.delete_contest_team_member_by_pk.team_id;
}

export const delete_contest_time:any = async(contest_id:string,event:string) => {
  const delete_contest_time:any = await client.request(
    gql`
    mutation DeleteContestTime($contest_id: uuid!, $event: String!) {
      delete_contest_time_by_pk(contest_id: $contest_id, event: $event) {
        event
      }
    }
    `,
    {
      contest_id: contest_id,
      event: event
    });
    return delete_contest_time.delete_contest_time_by_pk.event;
  }