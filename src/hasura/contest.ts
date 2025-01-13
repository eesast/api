import { gql } from "graphql-request";
import { client } from "..";


export interface TeamInfo {
  team_id: string;
  team_name: string;
  player: string[];
  team_leader_uuid: string;
}

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
 *
 * @param {string} contest_id
 * @param {string} name
 * @param {string} filename
 * @param {string} team_labels
 * @returns {Promise<string>}
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
  return add_contest_map.insert_contest_map_one?.map_id ?? undefined;
}

/**
 *
 * @param {string} title
 * @param {string} content
 * @param {string} files
 * @param {string} contest_id
 * @returns {Promise<string>}
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
  return add_contest_notice.insert_contest_notice_one?.id?? undefined;
}

/**
 *
 * @param {string} contest_id
 * @param {string} team_label
 * @param {string} player_label
 * @param {string} roles_available
 * @returns {Promise<string>}
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
  return add_contest_player.insert_contest_player_one?.team_label?? undefined;
}

/**
 *
 * @param {string} contest_id         ID
 * @param {string} name
 * @param {string} map_id         ID
 * @returns {Promise<string>}     ID
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
  return add_contest_round.insert_contest_round_one?.round_id?? undefined;
}

/**
 *
 * @param {string} team_id       ID
 * @param {string} code_name
 * @param {string} language
 * @param {string} compile_status
 * @returns {Promise<string>}    ID
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
    return add_team_code.insert_contest_team_code_one?.code_id?? undefined;
  }

/**
 *
 * @param {string} team_id       ID
 * @param {string} player
 * @returns {Promise<string>}
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
  return add_team_player.insert_contest_team_player_one?.player?? undefined;
}

/**
 *
 * @param {string} team_name
 * @param {string} team_intro
 * @param {string} team_leader_uuid         UUID
 * @param {string} invited_code
 * @param {string} contest_id         ID
 * @returns {Promise<string>}  ID
 */
export const add_team:any = async(team_name:string,team_intro:string,team_leader_uuid:string,invited_code:string,contest_id:string) =>{
  const add_team:any = await client.request(
    gql`
    mutation AddTeam(
      $team_name: String!
      $team_intro: String = "" # 此处的intro可以为NULL
      $team_leader_uuid: uuid! # team_leader的uuid
      $invited_code: String!
      $contest_id: uuid! #       是必填的项
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
    return add_team.insert_contest_team_one?.team_id ?? undefined;
  }

/**
 *
 * @param {string} team_id       ID
 * @param {string} user_uuid         UUID
 * @returns {Promise<string>}  ID
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
    return add_team_member.insert_contest_team_member_one?.team_id?? undefined;
  }

/**
 *
 * @param {uuid} contest_id         ID
 * @param {string} event
 * @param {timestamptz} start
 * @param {timestamptz} end
 * @param {string} description
 * @returns {Promise<string>}
 */
export const add_contest_time:any = async(contest_id:string,event:string,start:Date,end:Date,description:string) =>{
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
      start: new Date(start),
      end: new Date(end),
      description: description
    });
    return add_contest_time.insert_contest_time_one?.event?? undefined;
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

/**
 * Updates the contest information.
 *
 * @param {string} contest_id      The ID of the contest to update.
 * @param {string} fullname      The new full name of the contest.
 * @param {string} description      The new description of the contest.
 * @param {Date} start_date      The new start date of the contest (timestamp).
 * @param {Date} end_date      The new end date of the contest (timestamp).
 * @returns {string} The ID of the updated contest.
 */
export const update_contest_info:any = async(contest_id: string, updateFields:Partial<{fullname: string; description: string; start_date: Date;end_date: Date}>) => {

  const setFields:{[key:string]:any} = {};
  if (updateFields.fullname) setFields.fullname = updateFields.fullname;
  if (updateFields.description) setFields.description = updateFields.description;
  if (updateFields.start_date) setFields.start_date = updateFields.start_date;
  if (updateFields.end_date) setFields.end_date = updateFields.end_date;

  if (Object.keys(setFields).length === 0) {
    console.error("At least update one feature");
    return undefined;
  }

  const setString = Object.keys(setFields)
  .map(key => `${key}: $${key}`)
  .join(', ');

  const variableString = Object.keys(setFields)
  .map(key => `$${key}: String`)
  .join(', ');

  const mutation = gql`
  mutation UpdateContest($contest_id: uuid!, ${variableString}) {
    update_contest_by_pk(pk_columns: { id: $contest_id }, _set: { ${setString} }) {
      id
      fullname
      description
      start_date
      end_date
    }
  }
  `;

  const variables:{[key:string]:any} = {
    contest_id:contest_id
  }
  if(setFields.fullname) variables.fullname = setFields.fullname;
  if(setFields.description) variables.description = setFields.description;
  if(setFields.start_date) variables.start_date = setFields.start_date;
  if(setFields.end_date) variables.end_date = setFields.end_date;

  try {
    const response: any = await client.request(mutation, variables);
    return response.update_contest_by_pk?.id ?? undefined;
  } catch (error) {
    console.error('Error updating contest info', error);
    throw error;
  }
}

/**
 * Updates the contest switches.
 *
 * @param {string} contest_id      The ID of the contest to update.
 * @param {boolean} team_switch      The new state of the team switch.
 * @param {boolean} code_upload_switch      The new state of the code upload switch.
 * @param {boolean} arena_switch      The new state of the arena switch.
 * @param {boolean} playground_switch      The new state of the playground switch.
 * @param {boolean} stream_switch      The new state of the stream switch.
 * @param {boolean} playback_switch      The new state of the playback switch.
 * @returns {string} The ID of the updated contest.
 */
export const update_contest_switch:any = async(contest_id: string, team_switch: boolean, code_upload_switch: boolean, arena_switch: boolean, playground_switch: boolean, stream_switch: boolean, playback_switch:boolean) => {
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
    }
  );

  return update_contest_switch.update_contest_by_pk?.id?? undefined;
}

/**
 * Updates the contest map.
 *
 * @param {string} map_id      The ID of the map to update.
 * @param {string} name      The new name of the map.
 * @param {string} filename      The new filename of the map.
 * @param {string} team_labels      The new team labels of the map.
 * @returns {string} The ID of the updated map.
 */
export const update_contest_map:any = async(map_id:string, updateFields: Partial<{ name: string; filename: string; team_labels: string }>) => {
  const setFields: any = {};
    if(updateFields.name) setFields.name = updateFields.name;
    if(updateFields.filename) setFields.filename = updateFields.filename;
    if(updateFields.team_labels) setFields.team_labels = updateFields.team_labels;

    if(Object.keys(setFields).length === 0 ){
      console.error("At least update one feature");
      return undefined;
    }

    const setString = Object.keys(setFields)
    .map(key => `${key}: $${key}`)
    .join(', ');

    const variableString = Object.keys(setFields)
    .map(key => `$${key}: String`)
    .join(', ');

    const mutation = gql`
      mutation UpdateContestMap($map_id: uuid!, ${variableString}) {
      update_contest_map_by_pk(pk_columns: { map_id: $map_id }, _set: { ${setString} }) {
        map_id
        name
        filename
        team_labels
      }
    }
    `;

/*    const variables = {
      map_id,
      ...setFields
    }
    本以为这样可以，但是不能，因为setFields是一个对象，而variables是一个数组
    */

    const variables:{[key:string]:any} = {
      map_id: map_id
    }

    if(setFields.name) variables.name = setFields.name;
    if(setFields.filename) variables.filename = setFields.filename;
    if(setFields.team_labels) variables.team_labels = setFields.team_labels;

    try {
      const response:any = await client.request(mutation,variables);
      return response.update_contest_map_by_pk?.map_id?? undefined;
    }catch(error){
      console.error('Error updating contest map', error);
      throw(error);
    }
}

/**
 * Updates the contest notice.
 *
 * @param {string} id      The ID of the notice to update.
 * @param {string} title     Optional The new title of the notice.
 * @param {string} content    Optional  The new content of the notice.
 * @param {string} files      Optional The new files of the notice.
 * @returns {string} The ID of the updated notice.
 */
export const update_contest_notice: any = async (id: string, updateFields: Partial<{ title: string; content: string; files: string }>) => {
  const setFields: any = {};
  if (updateFields.title) setFields.title = updateFields.title;
  if (updateFields.content) setFields.content = updateFields.content;
  if (updateFields.files) setFields.files = updateFields.files;

  if (Object.keys(setFields).length === 0) {
    console.error("At least update one feature");
    return undefined;
  }

  const variableString = Object.keys(setFields)
  .map(key=>`$${key}`)
  .join(', ');

  const setString = Object.keys(setFields)
  .map(key => `${key}: $${key}`)
  .join(', ');

  const mutation = gql`
    mutation UpdateContestNotice($id: uuid!, ${variableString}) {
      update_contest_notice_by_pk(pk_columns: { id: $id }, _set: { ${setString} }) {
        id
        title
        content
        files
      }
    }
  `;

  const variables:{[key:string]:any} = {
    id:id
  }
  if(setFields.title) variables.title = setFields.title;
  if(setFields.content) variables.content = setFields.content;
  if(setFields.files) variables.files = setFields.files;


  try {
    const response: any = await client.request(mutation, variables);
    return response.update_contest_notice_by_pk?.id ?? undefined;
  } catch (error) {
    console.error('Error updating contest notice', error);
    throw error;
  }
};

/**
 * Updates the contest player.
 *
 * @param  {string} contest_id      The ID of the contest to update.
 * @param {string} team_label      The new team label of the player.
 * @param {string} player_label   Optional   The new player label.
 * @param {string} roles_available   Optional   The new roles available for the player.
 * @returns {string} The team label of the updated player.
 */
export const update_contest_player: any = async (contest_id: string, player_label: string, team_label:string,updateFields: Partial<{roles_available: string }>) => {
  const setFields: any = {};
  if (updateFields.roles_available) setFields.roles_available = updateFields.roles_available;

  if (Object.keys(setFields).length === 0) {
    console.error("At least update one feature");
    return undefined;
  }

  const variableString = Object.keys(setFields)
  .map(key => `$${key}: String`)
  .join(', ');

  const setString = Object.keys(setFields)
  .map(key => `${key}: $${key}`)
  .join(', ');

  const mutation = gql`
    mutation UpdateContestPlayer($contest_id: uuid!, $player_label: String!, $team_label:String!,${variableString}) {
      update_contest_player_by_pk(pk_columns: { contest_id: $contest_id, player_label: $player_label ,team_label:$team_label} _set: { ${setString} }) {
        team_label
        player_label
        roles_available
      }
    }
  `;

  const variables:{[key:string]:any} = {
    contest_id:contest_id,
    player_label:player_label,
    team_label:team_label
  }

  if(setFields.roles_available) variables.roles_available = setFields.roles_available;

  try {
    const response: any = await client.request(mutation, variables);
    return response.update_contest_player_by_pk?.team_label ?? undefined;
  } catch (error) {
    console.error('Error updating contest player', error);
    throw error;
  }
};

/**
 * Updates the contest round name.
 *
 * @param {string} round_id      The ID of the round to update.
 * @param {string} name      The new name of the round.
 * @returns {string} The ID of the updated round.
 */
export const update_contest_round_name:any = async(round_id:string,name:string) => {
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
    }
  );

  return update_contest_round_name.update_contest_round_by_pk?.round_id?? undefined;
}

/**
 * Updates the team code name.
 *
 * @param {string} code_id      The ID of the code to update.
 * @param {string} code_name      The new name of the code.
 * @returns {string} The ID of the updated code.
 */
export const update_team_code_name:any = async(code_id:string,code_name:string) => {
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
    }
  );

  return update_team_code_name.update_contest_team_code_by_pk?.code_id?? undefined;
}

/**
 * Update a team player's information
 * @param {string} team_id      The ID of the team
 * @param {string} player      The player to be updated
 * @param {string} code_id      The code ID associated with the player
 * @param {string} role      The role of the player
 * @returns {Promise<string>}      The updated player's information
 */
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
    return update_team_player.update_contest_team_player_by_pk?.player?? undefined;
  }


/**
 * Update a team's information
 * @param {string} team_id      The ID of the team
 * @param {string} team_name      The name of the team
 * @param {string} team_intro      The introduction of the team
 * @returns {Promise<string>}      The updated team's ID
 */

export const update_team:any = async(team_id:string,updateFields:Partial<{ team_name: string; team_intro: string}>) =>{
  const setFields: any = {};
  if (updateFields.team_name) setFields.team_name = updateFields.team_name;
  if (updateFields.team_intro) setFields.team_intro = updateFields.team_intro;

  if (Object.keys(setFields).length === 0) {
    console.error("At least update one feature");
    return undefined;
  }

  const variableString = Object.keys(setFields)
  .map(key => `$${key}: String`)
  .join(',')

  const setString = Object.keys(setFields)
  .map(key => `${key}: $${key}`)
  .join(',')

  const mutation =  gql`
    mutation UpdateTeam(
      $team_id: uuid!,
      ${variableString}
    ) {
      update_contest_team_by_pk(
        pk_columns: { team_id: $team_id }
        _set: { ${setString} }
      ) {
        team_id
      }
    }
    `;
  const variables:{[key:string]:any}= {
    team_id:team_id
  }
  if(setFields.team_name) variables.team_name = setFields.team_name;
  if(setFields.team_intro) variables.team_intro = setFields.team_intro;


  try {
    const response: any = await client.request(mutation, variables);
    return response.update_contest_team_by_pk?.team_id ?? undefined;
  } catch (error) {
    console.error('Error updating contest player', error);
    throw error;
  }
}

/**
 * Update contest time information
 * @param {string} contest_id      The ID of the contest
 * @param {string} event      The event to be updated
 * @param {Date} start      The start time of the event
 * @param {Date} end      The end time of the event
 * @param {string} description      The description of the event
 * @returns {Promise<string>}      The updated event information
 */

export const update_contest_time:any = async(contest_id:string,event:string,start:Date,end:Date,description:string) =>{
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
      start: new Date(start),
      end: new Date(end),
      description: description
    });
    return update_contest_time.update_contest_time_by_pk?.event?? undefined;
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

/**
 * Delete a contest
 * @param {string} contest_id      The ID of the contest to be deleted
 * @returns {Promise<number>}      The number of affected rows
 */
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

  return delete_contest.delete_contest?.affected_rows?? undefined;
}

/**
 * Delete a contest map
 * @param {string} map_id      The ID of the map to be deleted
 * @returns {Promise<string>}      The ID of the deleted map
 */

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

  return delete_contest_map.delete_contest_map_by_pk?.map_id?? undefined;
}

/**
 * Delete a contest notice
 * @param {string} id      The ID of the notice to be deleted
 * @returns {Promise<string>}      The ID of the deleted notice
 */

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
  return delete_contest_notice.delete_contest_notice_by_pk?.id?? undefined;
}

/**
 * Delete a contest player
 * @param {string} contest_id      The ID of the contest
 * @param {string} team_label      The label of the team
 * @param {string} player_label      The label of the player
 * @returns {Promise<string>}      The label of the deleted team
 */

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
  return delete_contest_player.delete_contest_player_by_pk?.team_label?? undefined;
}


/**
 * Delete a contest round
 * @param {string} round_id      The ID of the round to be deleted
 * @returns {Promise<string>}      The ID of the deleted round
 */

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
  return delete_contest_round.delete_contest_round_by_pk?.round_id?? undefined;
}

/**
 * Delete a team code
 * @param {string} code_id      The ID of the code to be deleted
 * @returns {Promise<string>}      The ID of the deleted code
 */

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
    return delete_team_code.delete_contest_team_code_by_pk?.code_id?? undefined;
}


/**
 * Delete a team
 * @param {string} team_id      The ID of the team to be deleted
 * @returns {Promise<string>}      The ID of the deleted team
 */


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
    return delete_team.delete_contest_team_by_pk?.team_id?? undefined;
}


/**
 * Delete a team member
 * @param {string} user_uuid      The UUID of the user
 * @param {string} team_id      The ID of the team
 * @returns {Promise<string>}      The ID of the team
 */

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
    return delete_team_member.delete_contest_team_member_by_pk?.team_id?? undefined;
}

/**
 * Delete contest time
 * @param {string} contest_id      The ID of the contest
 * @param {string} event      The event to be deleted
 * @returns {Promise<string>}      The event of the deleted contest time
 */

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
    return delete_contest_time.delete_contest_time_by_pk?.event?? undefined;
  }
