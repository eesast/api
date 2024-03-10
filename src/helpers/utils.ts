import { gql } from "graphql-request";
import { client } from "..";

export const base_directory = process.env.NODE_ENV === "production" ? '/data' : '/Users/zhenzhengdehuoyubai/Downloads';

export const get_contest_name: any = async (contest_id: string) => {
  const query_contest_name = await client.request(
    gql`
      query get_contest_name($contest_id: uuid) {
        contest(where: { id: { _eq: $contest_id } }) {
          name
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return query_contest_name.contest[0].name;
};

type ContestImages = {
  [key: string]: {
    RUNNER_IMAGE: string;
    COMPILER_IMAGE: string;
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    RUNNER_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp"
  },
  "THUAI7": {
    RUNNER_IMAGE: "eesast/thuai7_run",
    COMPILER_IMAGE: "eesast/thuai7_cpp"
  }
}
