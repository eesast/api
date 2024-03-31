import { gql } from "graphql-request";
import { client } from "..";

export const get_base_directory = async () => {
  return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!;
}

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


type ContestImages = {
  [key: string]: {
    RUNNER_IMAGE: string;
    COMPILER_IMAGE: string;
    COMPILER_TIMEOUT: string;
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    RUNNER_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp",
    COMPILER_TIMEOUT: "10m"
  },
  "THUAI7": {
    RUNNER_IMAGE: "eesast/thuai7_run",
    COMPILER_IMAGE: "eesast/thuai7_cpp",
    COMPILER_TIMEOUT: "10m"
  }
}
