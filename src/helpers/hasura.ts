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
  return query_contest_settings.contest[0] ?? null;
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
 * @returns {string} compile_status
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
        contest_room_team_aggregate(where: {_and: {team_id: {_eq: $team_id}, contest_room: {_and: {contest_id: {_eq: $contest_id}, _or: {status: {_eq: "Waiting"}, status: {_eq: "Running"}}}}}}) {
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


// insert a new room
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


// // insert a new room_team
// export const insert_room_team: any = async (room_id: string, team_id: string, team_label: string, player_roles: Array<string>, player_codes: Array<string>) => {
//   const player_roles_json = JSON.stringify(player_roles);
//   const player_codes_json = JSON.stringify(player_codes);

//   const insert_room_team = await client.request(
//     gql`
//       mutation insert_room_team($room_id: uuid!, $team_id: uuid!, $team_label: String!, $player_roles: String!, $player_codes: String!) {
//         insert_contest_room_team_one(object: {room_id: $room_id, team_id: $team_id, team_label: $team_label, player_roles: $player_roles, player_codes: $player_codes}) {
//           room_id
//         }
//       }
//     `,
//     {
//       room_id,
//       team_id,
//       team_label,
//       player_roles: player_roles_json,
//       player_codes: player_codes_json
//     }
//   );

//   return insert_room_team.insert_contest_room_team_one?.room_id ?? null;
// }



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
