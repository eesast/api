import { gql } from "graphql-request";
import { client } from "..";

export const base_directory = process.env.NODE_ENV === "production" ? '/data' : '/Users/zhenzhengdehuoyubai/Downloads';

export const get_contest_name: any = async (contest_id: string) => {
  const query_contest_name = await client.request(
    gql`
      query get_contest_name($contest_id: uuid) {
        contest(where: { id: { _eq: $contest_id } }) {
          contest_name
        }
      }
    `,
    {
      contest_id: contest_id,
    }
  );
  return query_contest_name.contest[0].contest_name;
};
