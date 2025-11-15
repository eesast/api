import { gql } from "graphql-request";
import { client } from "..";

export const mutation_update_user_profile = async (uuid: string, className?: string, department?: string, realname?: string, student_no?: string, username?: string) => {
  const variables: any = { };
  if (className !== undefined) variables.class = className;
  if (department !== undefined) variables.department = department;
  if (realname !== undefined) variables.realname = realname;
  if (student_no !== undefined) variables.student_no = student_no;
  if (username !== undefined) variables.username = username;
  const query: any = await client.request(
    gql`
    mutation UpdateProfile(
      $uuid: uuid!
      $class: String
      $department: String
      $realname: String
      $student_no: String
      $username: String
    ) {
      update_users_by_pk(
        pk_columns: { uuid: $uuid }
        _set: {
          class: $class
          department: $department
          username: $username
          student_no: $student_no
          realname: $realname
        }
      ) {
        updated_at
      }
    }
    `,
    { uuid, ...variables}
  );
  return query.update_users_by_pk.updated_at;
}
