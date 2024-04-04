import { gql } from "graphql-request";
import { client } from "..";


// query contest_name from contest_id
export const get_contest_name: any = async (contest_id: string) => {
  const query_contest_name = await client.request(
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

// query contest_id from contest_name
export const get_contest_id: any = async (contest_name: string) => {
  const query_contest_id = await client.request(
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

// query contest settings from contest_id
export const get_contest_settings: any = async (contest_id: string) => {
  const query_contest_settings = await client.request(
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

// query team_id from user_uuid and contest_id
export const get_team_from_user: any = async (user_uuid: string, contest_id: string) => {
  const query_team_id = await client.request(
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

// query team_id from code_id
export const get_team_from_code: any = async (code_id: string) => {
  const query_team_id = await client.request(
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
  const query_compile_status = await client.request(
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
 * query score from team_id
 * @param {string} team_id
 * @returns {number} score
 */
export const get_team_score: any = async (team_id: string) => {
  const query_score = await client.request(
    gql`
      query get_score($team_id: uuid!) {
        contest_team(where: {team_id: {_eq: $team_id}}) {
          score
        }
      }
    `,
    {
      team_id: team_id,
    }
  );

  return parseInt(query_score.contest_team[0]?.score) ?? 0;
};




  // contest_team(order_by: {team_id: asc}, where: {team_id: {_in: ""}}) {
  //   score
  //   contest_score
  // }

/**
 * query score and contest_score from team_ids, ordered by team_id, ascending
 * @param {string[]} team_ids
 * @returns {utils.ContestResult[]} [{team_id, score}]
 */
export const get_teams_score: any = async (team_ids: Array<string>) => {
  const query_score = await client.request(
    gql`
      query get_score($team_ids: [uuid!]!) {
        contest_team(where: {team_id: {_in: $team_ids}}) {
          team_id
          score
        }
      }
    `,
    {
      team_ids: team_ids,
    }
  );
  return query_score.contest_team?.map((team: any) => ({
    team_id: team.team_id,
    score: parseInt(team.score)
  })) ?? [];
};

// query manager_uuid from user_uuid and contest_id
export const get_maneger_from_user: any = async (user_uuid: string, contest_id: string) => {
  const query_if_manager = await client.request(
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

// query language and contest_id from code_id
export const query_code: any = async (code_id: string) => {
  const query_all_from_code = await client.request(
    gql`
      query get_all_from_code($code_id: uuid!) {
        contest_team_code(where: {code_id: {_eq: $code_id}}) {
          team_id
          language
          compile_status
          contest_team {
            contest_id
            contest {
              contest_name
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
    contest_name: query_all_from_code.contest_team_code[0]?.contest_team?.contest?.contest_name ?? null,
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
  const count_room_from_team = await client.request(
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
 * query player_label from contest_id and team_label
 * @param {string} contest_id
 * @param {string} team_label
 * @returns {string[]} player_labels
 */
export const get_players_label: any = async (contest_id: string, team_label: string) => {
  const query_players_label = await client.request(
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
  const query_code_id = await client.request(
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
 * insert a new room
 * @param {string} contest_id
 * @param {string} status
 * @param {string} map_id
 * @returns {string} room_id
 */
export const insert_room: any = async (contest_id: string, status: string, map_id: string) => {
  const insert_room = await client.request(
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
  const insert_room = await client.request(
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
 * query roound info from round_id
 * @param {string} round_id
 * @returns {object} {contest_id, map_id}
 */
export const get_round_info: any = async (round_id: string) => {
  const query_round_info = await client.request(
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
  const query_players = await client.request(
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
  const query_teams = await client.request(
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
 * Insert room_teams
 * @param {string} room_id
 * @param {string[]} team_ids
 * @param {string[]} team_labels
 * @param {string[][]} player_roles
 * @param {string[][]} player_codes
 * @returns {number} affected_rows
 */
export const insert_room_teams: any = async (room_id: string, team_ids: Array<string>, team_labels: Array<string>, player_roles: Array<Array<string>>, player_codes: Array<Array<string>>) => {
  const insert_room_teams = await client.request(
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
 * update compile_status
 * @param {string} code_id
 * @param {string} compile_status
 * @returns {number} affected_rows
 */
export const update_compile_status: any = async (code_id: string, compile_status: string) => {
  const update_compile_status = await client.request(
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
 * update room status
 * @param {string} room_id
 * @param {string} status
 * @param {number} port
 * @returns {number} affected_rows
 */
export const update_room_status: any = async (room_id: string, status: string, port: number | null) => {
  const update_room_status = await client.request(
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
 * update room_team score
 * @param {string} room_id
 * @param {string} team_id
 * @param {number} score
 */
export const update_room_team_score: any = async (room_id: string, team_id: string, score: number) => {
  const update_room_team_score = await client.request(
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
      score: score.toString()
    }
  );

  return update_room_team_score.update_contest_room_team.affected_rows;
}


/**
 * update team score
 * @param {string} team_id
 * @param {number} score
 */
export const update_team_score: any = async (team_id: string, score: number) => {
  const update_team_score = await client.request(
    gql`
      mutation update_team_score($team_id: uuid!, $score: String!) {
        update_contest_team(where: {team_id: {_eq: $team_id}}, _set: {score: $score}) {
          affected_rows
        }
      }
    `,
    {
      team_id: team_id,
      score: score.toString()
    }
  );

  return update_team_score.update_contest_team.affected_rows;
}
