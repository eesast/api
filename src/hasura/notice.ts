import { gql } from "graphql-request";
import { client } from "..";
export const update_notice = async (id: string, updateFields: Partial<{title: string, content: string, files: string, notice_type: string}>) => {
  if(Object.keys(updateFields).length === 0) return null;
  const setFields: any = {};
  if(updateFields.title) setFields.title = updateFields.title;
  if(updateFields.content) setFields.content = updateFields.content;
  if(updateFields.files) setFields.files = updateFields.files;
  if(updateFields.notice_type) setFields.notice_type = updateFields.notice_type;
  const variablesString = Object.keys(setFields)
  .map(key => `$${key} : String`)
  .join('\n');
  const setString = Object.keys(setFields)
  .map(key => `${key}: $${key}`)
  .join('\n');
  const mutation = gql`
    mutation UpdateNotice($id: uuid!
       ${variablesString}) {
      update_info_notice_by_pk(pk_columns: {id: $id } 
        _set: { ${setString} }
        ) {
        id
      }
    }
  `;
  console.log(mutation);
  const variables: {[key: string]: any} = {
    id: id,
    title: updateFields.title,
    content: updateFields.content,
    files: updateFields.files,
    notice_type: updateFields.notice_type
  };
  try {
    const response: any = await client.request(mutation, variables);
    return response.update_info_notice_by_pk?.id ?? null;
  } catch (error) {
    console.error('Error updating notice', error);
    throw error;
  }
}

export const add_notice = async (title: string, content: string, files: string, notice_type: string) => {
  const query: any = await client.request(
    gql`
        mutation AddNotice(
            $title: String!
            $content: String!
            $files: String!
            $notice_type: String!
        )   {
                insert_info_notice(
                    objects: {
                        title: $title
                        content: $content
                        files: $files
                        notice_type: $notice_type
                    }
                )   {
                    returning {
                    id
            }
        }
    }
        `,
    {
      title: title,
      content: content,
      files: files,
      notice_type: notice_type
    }
  );
  return query.insert_info_notice?.id ?? null;
}

export const delete_notice = async (id: string) => {
  const query: any = await client.request(
    gql`
        mutation DeleteNotice($id: uuid!) {
            delete_info_notice(where: { id: { _eq: $id } }) {
                returning {
                    id
                }
            }
        }
    `,  {
    id: id
  }
);
return query.delete_info_notice_by_pk?.id ?? null;
}