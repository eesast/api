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

export const query_honor_application = async (id: string) => {
  const query: any = await client.request(
    gql`
      query QueryHonorApplication($id: uuid!) {
        honor_application_by_pk(id: $id) {
          id
          student_uuid
          honor
          statement
          attachment_url
          year
          status
        }
      }
    `,
    { id: id }
  );
  return query.honor_application_by_pk ?? null;
}

export const insert_honor_application = async (
  student_uuid: string,
  honor: string,
  statement: string,
  attachment_url: string | undefined,
  year: number
) => {
  const query: any = await client.request(
    gql`
      mutation InsertHonorApplication(
        $student_uuid: uuid!
        $honor: String!
        $statement: String!
        $attachment_url: String
        $year: Int!
      ) {
        insert_honor_application_one(
          object: {
            student_uuid: $student_uuid
            honor: $honor
            statement: $statement
            attachment_url: $attachment_url
            year: $year
          }
        ) {
          id
        }
      }
    `,
    {
      student_uuid: student_uuid,
      honor: honor,
      statement: statement,
      attachment_url: attachment_url,
      year: year
    }
  );
  return query.insert_honor_application_one?.id ?? null;
}

export const update_honor_application_with_attachment = async (
  id: string,
  honor: string,
  statement: string,
  attachment_url: string,
) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplication(
        $id: uuid!
        $honor: String!
        $statement: String!
        $attachment_url: String!
      ) {
        update_honor_application_by_pk(
          pk_columns: {id: $id}
          _set: {
            honor: $honor
            statement: $statement
            attachment_url: $attachment_url
          }
        ) {
          id
        }
      }
    `,
    {
      id: id,
      honor: honor,
      statement: statement,
      attachment_url: attachment_url
    }
  );
  return query.update_honor_application_by_pk?.id ?? null;
}


export const update_honor_application = async (
  id: string,
  honor: string,
  statement: string,
) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplication(
        $id: uuid!
        $honor: String!
        $statement: String!
      ) {
        update_honor_application_by_pk(
          pk_columns: {id: $id}
          _set: {
            honor: $honor
            statement: $statement
          }
        ) {
          id
        }
      }
    `,
    {
      id: id,
      honor: honor,
      statement: statement,
    }
  );
  return query.update_honor_application_by_pk?.id ?? null;
}

export const delete_honor_application = async (id: string) => {
  const query: any = await client.request(
    gql`
      mutation DeleteMentorApplication($id: uuid!) {
        delete_honor_application_by_pk(id: $id) {
          id
        }
      }
    `,
    { id: id }
  );
  return query.delete_honor_application_by_pk?.id ?? null;
}

export const update_honor_application_status = async (id: string, status: string) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplicationStatus($id: uuid!, $status: String!) {
        update_honor_application_by_pk(
          pk_columns: {id: $id}
          _set: { status: $status }
        ) {
          id
        }
      }
    `,
    { id: id, status: status }
  );
  return query.update_honor_application_by_pk?.id ?? null;
}
