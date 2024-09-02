import { gql } from "graphql-request";
import { client } from "..";

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
