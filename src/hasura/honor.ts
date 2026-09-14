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
    { uuid: uuid },
  );
  return query.users_by_pk?.role ?? "anonymous";
};

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
          application_form_url
          year
          status
          transcript_url
        }
      }
    `,
    { id: id },
  );
  return query.honor_application_by_pk ?? null;
};

export const insert_honor_application = async (
  student_uuid: string,
  honor: string,
  statement: string,
  attachment_url: string | null,
  application_form_url: string | null,
  transcript_url: string | null,
  year: number,
) => {
  const object: Record<string, unknown> = {
    student_uuid: student_uuid,
    honor: honor,
    statement: statement,
    attachment_url: attachment_url,
    application_form_url: application_form_url,
    transcript_url: transcript_url,
    year: year,
  };

  const query: any = await client.request(
    gql`
      mutation InsertHonorApplication(
        $object: honor_application_insert_input!
      ) {
        insert_honor_application_one(object: $object) {
          id
        }
      }
    `,
    { object: object },
  );
  return query.insert_honor_application_one?.id ?? null;
};

export const update_honor_application = async (
  id: string,
  honor: string,
  statement: string,
  attachment_url: string | null,
  application_form_url: string | null,
  transcript_url: string | null,
) => {
  const set: Record<string, unknown> = {
    honor: honor,
    statement: statement,
    attachment_url: attachment_url,
    application_form_url: application_form_url,
    transcript_url: transcript_url,
  };

  const query: any = await client.request(
    gql`
      mutation UpdateHonorApplication(
        $id: uuid!
        $set: honor_application_set_input!
      ) {
        update_honor_application_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
        }
      }
    `,
    { id: id, set: set },
  );
  return query.update_honor_application_by_pk?.id ?? null;
};

export const delete_honor_application = async (id: string) => {
  const query: any = await client.request(
    gql`
      mutation DeleteMentorApplication($id: uuid!) {
        delete_honor_application_by_pk(id: $id) {
          id
        }
      }
    `,
    { id: id },
  );
  return query.delete_honor_application_by_pk?.id ?? null;
};

export const update_honor_application_status = async (
  id: string,
  status: string,
) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplicationStatus($id: uuid!, $status: String!) {
        update_honor_application_by_pk(
          pk_columns: { id: $id }
          _set: { status: $status }
        ) {
          id
        }
      }
    `,
    { id: id, status: status },
  );
  return query.update_honor_application_by_pk?.id ?? null;
};
