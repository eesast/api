import { gql } from "graphql-request";
import { client } from "..";

export const query_user_role = async (uuid: string) => {
  const query: any = await client.request(
    gql`
      query QueryUserRole($uuid: uuid!) {
        users_by_pk(uuid: $uuid) {
          role
        }
      }
    `,
    { uuid: uuid }
  );
  return query.users_by_pk?.role ?? "anonymous";
}
