import { gql } from "graphql-request";
import { client } from "..";
// These graphql statements do not actually return id, instead they return nothing.
//export const update_notice = async (id: string, title: string, content: string, files: string, notice_type: string) => {
//  const query: any = await client.request(
//    gql`
//        mutation UpdateNotice(
//            $id: uuid!
//            $title: String!
//            $content: String!
//            $files: String!
//            $notice_type: String!
//        )   {
//                update_info_notice(
//                    where: { id: { _eq: $id } }
//                    _set: {
//                        title: $title
//                        content: $content
//                        files: $files
//                        notice_type: $notice_type
//                    }
//                )   {
//                    returning {
//                    id
//            }
//        }
//    }
//        `,
//    {
//      id: id,
//      title: title,
//      content: content,
//      files: files,
//      notice_type: notice_type
//    }
//  );
//  return query.update_info_notice?.id ?? null;
//}
//export const update_mentor_info_description = async (mentor_uuid: string,updateFields: Partial<{achievement: string, background: string, field: string, intro: string}>) => {
//  if(Object.keys(updateFields).length === 0) return null;
//  const setFields: any = {};
//  if(updateFields.achievement) setFields.achievement = updateFields.achievement;
//  if(updateFields.background) setFields.background = updateFields.background;
//  if(updateFields.field) setFields.field = updateFields.field;
//  if(updateFields.intro) setFields.intro = updateFields.intro;
//  const variablesString = Object.keys(setFields)
//  .map(key => `$${key} : String`)
//  .join('\n');
//  const setString = Object.keys(setFields)
//  .map(key => `${key}: $${key}`)
//  .join('\n');
//  const mutation = gql`
//    mutation UpdateMentorInfoDescription($mentor_uuid: uuid!
//       ${variablesString}) {
//      update_mentor_info_by_pk(pk_columns: {mentor_uuid: $mentor_uuid }
//        _set: { ${setString} }
//        ) {
//        mentor_uuid
//      }
//    }
//  `;
//  console.log(mutation);
//  const variables: {[key: string]: any} = {
//    mentor_uuid: mentor_uuid,
//    achievement: updateFields.achievement,
//    background: updateFields.background,
//    field: updateFields.field,
//    intro: updateFields.intro
//  };
//  try {
//    const response: any = await client.request(mutation, variables);
//    return response.update_mentor_info_by_pk?.mentor_uuid ?? null;
//  } catch (error) {
//    console.error('Error updating mentor info', error);
//    throw error;
//  }
//}
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