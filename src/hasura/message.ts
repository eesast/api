import { gql } from "graphql-request";
import { client } from "..";

export const add_message = async (from_uuid: string, to_uuid: string, payload: string) => {
  const query: any = await client.request(
    gql`
      mutation AddMessage($from_uuid: uuid!, $to_uuid: uuid!, $payload: String!) {
        insert_mentor_message(
          objects: { from_uuid: $from_uuid, to_uuid: $to_uuid, payload: $payload }
        ) {
          returning {
            id
          }
        }
      }
    `,
    {
      from_uuid: from_uuid,
      to_uuid: to_uuid,
      payload: payload
    }
  );
  return query.insert_mentor_message ?? null;
}

export const subsribe_to_messages = async (from_uuid: string, to_uuid: string) => {
  const query: any = await client.request(
    gql`
      subscription SubscribeToMessages($from_uuid: uuid!, $to_uuid: uuid!) {
        mentor_message(
          order_by: { created_at: asc }
          where: {
            _or: [
              { _and: { from_uuid: { _eq: $from_uuid }, to_uuid: { _eq: $to_uuid } } }
              { _and: { from_uuid: { _eq: $to_uuid }, to_uuid: { _eq: $from_uuid } } }
            ]
          }
        ) {
          created_at
          from_uuid
          id
          payload
          to_uuid
        }
      }
    `,
    {
      from_uuid: from_uuid,
      to_uuid: to_uuid
    }
  );
  return query.mentor_message ?? null;
}
