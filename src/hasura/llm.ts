import { gql } from "graphql-request";
import { client } from "..";

export const get_user_llm_usage = async (student_no: string) => {
  const query: any = await client.request(
    gql`
      query GetUserLlmUsage($student_no: String!) {
        user_llm_usage_by_pk(student_no: $student_no) {
          student_no
          total_tokens_used
          token_limit
        }
      }
    `,
    { student_no },
  );
  return query.user_llm_usage_by_pk;
};

export const init_user_llm_usage = async (
  student_no: string,
  token_limit: number = 0,
  email?: string,
) => {
  const query: any = await client.request(
    gql`
      mutation InitUserLlmUsage(
        $student_no: String!
        $token_limit: bigint!
        $email: String
      ) {
        insert_user_llm_usage_one(
          object: {
            student_no: $student_no
            token_limit: $token_limit
            email: $email
          }
          on_conflict: {
            constraint: user_llm_usage_pkey
            update_columns: [email]
          }
        ) {
          student_no
          token_limit
          total_tokens_used
          email
        }
      }
    `,
    { student_no, token_limit, email },
  );
  return query.insert_user_llm_usage_one;
};

export const update_user_llm_usage = async (
  student_no: string,
  tokens_to_add: number,
) => {
  const query: any = await client.request(
    gql`
      mutation UpdateUserLlmUsage(
        $student_no: String!
        $tokens_to_add: bigint!
        $updated_at: timestamptz!
      ) {
        update_user_llm_usage_by_pk(
          pk_columns: { student_no: $student_no }
          _inc: { total_tokens_used: $tokens_to_add }
          _set: { last_updated_at: $updated_at }
        ) {
          total_tokens_used
          token_limit
        }
      }
    `,
    {
      student_no,
      tokens_to_add,
      updated_at: new Date().toISOString(),
    },
  );
  return query.update_user_llm_usage_by_pk;
};

export const set_user_llm_usage = async (
  student_no: string,
  total_usage: number,
) => {
  const query: any = await client.request(
    gql`
      mutation SetUserLlmUsage(
        $student_no: String!
        $total_usage: bigint!
        $updated_at: timestamptz!
      ) {
        update_user_llm_usage_by_pk(
          pk_columns: { student_no: $student_no }
          _set: {
            total_tokens_used: $total_usage
            last_updated_at: $updated_at
          }
        ) {
          total_tokens_used
          token_limit
        }
      }
    `,
    {
      student_no,
      total_usage,
      updated_at: new Date().toISOString(),
    },
  );
  return query.update_user_llm_usage_by_pk;
};

export const get_llm_model_config = async (model_value: string) => {
  const query: any = await client.request(
    gql`
      query GetLlmModelConfig($model_value: String!) {
        llm_list(where: { value: { _eq: $model_value } }) {
          name
          value
          deepthinkingmodel
        }
      }
    `,
    { model_value },
  );
  return query.llm_list[0];
};

export const log_access_key_usage = async (
  student_no: string,
  jti: string,
  email?: string,
) => {
  const query: any = await client.request(
    gql`
      mutation LogAccessKeyUsage(
        $student_no: String!
        $jti: String!
        $email: String
      ) {
        insert_access_key_log_one(
          object: { student_no: $student_no, jti: $jti, email: $email }
        ) {
          id
        }
      }
    `,
    { student_no, jti, email },
  );
  return query.insert_access_key_log_one;
};

export const check_access_key_usage = async (jti: string) => {
  const query: any = await client.request(
    gql`
      query CheckAccessKeyUsage($jti: String!) {
        access_key_log(where: { jti: { _eq: $jti } }) {
          id
        }
      }
    `,
    { jti },
  );
  return query.access_key_log.length > 0;
};
