import { gql } from "graphql-request";
import { client } from "..";
export interface Freshman_Insert_Input {
  realname: string;
  student_no: string;
  year: number;
  uuid: string;
}
export const get_mentor_info_list = async () => {
  const query: any = await client.request(
    gql`
      query GetMentorInfoList {
        mentor_info(order_by: { available: desc, max_applicants: desc }) {
          achievement
          available
          background
          field
          intro
          max_applicants
          mentor_uuid
          user {
            department
            email
            realname
          }
        }
      }
    `
  );
  return query.mentor_info;
}

export const get_mentor_info = async (uuid: string) => {
  const query: any = await client.request(
    gql`
      query GetMentorInfo($uuid: uuid!) {
        mentor_info_by_pk(mentor_uuid: $uuid) {
          achievement
          available
          background
          field
          intro
          max_applicants
          mentor_uuid
          user {
            department
            email
            realname
          }
        }
      }
    `,
    { uuid: uuid }
  );
  return query.mentor_info_by_pk ?? null;
}


export const get_mentor_applications_count = async (uuid: string, year: number) => {
  const query: any = await client.request(
    gql`
      query GetMentorApplicationsCount($uuid: uuid!, $year: Int!) {
        mentor_application_aggregate(
          where: { _and: { mentor_uuid: { _eq: $uuid }, year: { _eq: $year } } }
        ) {
          aggregate {
            count
          }
        }
      }
    `,
    { uuid: uuid, year: year }
  );
  return query.mentor_application_aggregate?.aggregate?.count ?? 0;
}


export const get_mentor_applications_approved_count = async (uuid: string, year: number) => {
  const query: any = await client.request(
    gql`
      query GetMentorApplicationsApprovedCount($uuid: uuid!, $year: Int!) {
        mentor_application_aggregate(
          where: {
            _and: {
              mentor_uuid: { _eq: $uuid }
              _and: { year: { _eq: $year }, status: { _eq: "approved" } }
            }
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `,
    { uuid: uuid, year: year }
  );
  return query.mentor_application_aggregate?.aggregate?.count ?? 0;
}

export const insert_mentor_application = async (mentor_uuid: string, student_uuid: string, year: number, statement: string) => {
  const query: any = await client.request(
    gql`
      mutation InsertMentorApplication(
        $mentor_uuid: uuid!
        $student_uuid: uuid!
        $year: Int!
        $statement: String = ""
      ) {
        insert_mentor_application_one(
          object: {
            statement: $statement
            mentor_uuid: $mentor_uuid
            student_uuid: $student_uuid
            year: $year
          }
        ) {
          id
        }
      }
    `,
    {
      mentor_uuid: mentor_uuid,
      student_uuid: student_uuid,
      year: year,
      statement: statement
    }
  );
  return query.insert_mentor_application_one?.id ?? null;
}

export const insert_mentor_info = async (mentor_uuid: string) => {
  const query: any = await client.request(
    gql`
      mutation InsertMentorInfo($mentor_uuid: uuid!) {
        insert_mentor_info_one(
          object: { mentor_uuid: $mentor_uuid }
          on_conflict: { constraint: mentor_info_pkey }
        ) {
          updated_at
        }
      }
    `,
    { mentor_uuid: mentor_uuid }
  );
  return query.insert_mentor_info_one?.updated_at ?? null;
}

export const update_mentor_info_available = async (uuid: string, available: boolean) => {
  const query: any = await client.request(
    gql`
    mutation UpdateMentorInfoAvailable($uuid: uuid!, $available: Boolean!) {
      update_mentor_info_by_pk(
        pk_columns: { mentor_uuid: $uuid }
        _set: { available: $available }
      ) {
        available
      }
    }
    `,
    { uuid: uuid, available: available }
  );
  return query.update_mentor_info_by_pk?.available ?? null;
}

export const update_mentor_info_description = async (mentor_uuid: string, achievement: string, background: string, field: string, intro: string, max_applicants: number) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorInfoDescription(
        $mentor_uuid: uuid!
        $achievement: String = ""
        $background: String = ""
        $field: String = ""
        $intro: String = ""
      ) {
        update_mentor_info_by_pk(
          pk_columns: { mentor_uuid: $mentor_uuid }
          _set: {
            achievement: $achievement
            background: $background
            field: $field
            intro: $intro
          }
        ) {
          mentor_uuid
        }
      }
    `,
    {
      mentor_uuid: mentor_uuid,
      achievement: achievement,
      background: background,
      field: field,
      intro: intro,
      max_applicants: max_applicants
    }
  );
  return query.update_mentor_info_by_pk?.mentor_uuid ?? null;
}

export const update_mentor_application_status = async (id: string, status: string) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplicationStatus($id: uuid!, $status: String!) {
        update_mentor_application_by_pk(
          pk_columns: { id: $id }
          _set: { status: $status }
        ) {
          status
        }
      }
    `,
    { id: id, status: status }
  );
  return query.update_mentor_application_by_pk?.status ?? null;
}

export const update_mentor_application_statement = async (id: string, statement: string) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplicationStatement($id: uuid!, $statement: String!) {
        update_mentor_application_by_pk(
          pk_columns: { id: $id }
          _set: { statement: $statement }
        ) {
          statement
        }
      }
    `,
    { id: id, statement: statement }
  );
  return query.update_mentor_application_by_pk?.statement ?? null;
}

export const delete_mentor_application = async (id: string) => {
  const query: any = await client.request(
    gql`
      mutation DeleteMentorApplication($id: uuid!) {
        delete_mentor_application_by_pk(id: $id) {
          id
        }
      }
    `,
    { id: id }
  );
  return query.delete_mentor_application_by_pk?.id ?? null;
}

export const update_mentor_application_chat_status = async (id: string, chat_status: string) => {
  const query: any = await client.request(
    gql`
      mutation UpdateMentorApplicationChatStatus($id: uuid!, $chat_status: String!) {
        update_mentor_application_by_pk(
          pk_columns: { id: $id }
          _set: { chat_status: $chat_status }
        ) {
          chat_status
        }
      }
    `,
    { id: id, chat_status: chat_status }
  );
  return query.update_mentor_application_by_pk?.chat_status ?? null;
}
//TODO: implement this function
export const insert_mentor_application_schedule = async (year: Date) => {

}

export const insert_freshman_info_list = async (fresman_data: Array<Freshman_Insert_Input>) => {
  const query: any = await client.request(
    gql`
      mutation InsertFreshmanInfoList($freshmanData: [freshman_insert_input!]!) {
        insert_freshman(
          objects: $freshmanData
          on_conflict: {
            constraint: freshman_pkey
            update_columns: [realname, student_no, year, uuid]
          }
        ) {
          affected_rows
        }
      }
    `,
    { fresman_data: fresman_data }
  );
  return query.insert_freshman_info?.affected_rows ?? 0;
}
