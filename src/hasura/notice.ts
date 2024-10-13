import { gql } from "graphql-request";
import { client } from "..";

export const update_notice = async (id: string, title: string, content: string, files: string, notice_type: string) => {
    const query: any = await client.request(
        gql`
        mutation UpdateNotice(
            $id: uuid!
            $title: String!
            $content: String!
            $files: String!
            $notice_type: String!
        )   {
                update_info_notice(
                    where: { id: { _eq: $id } }
                    _set: {
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
            id: id,
            title: title,
            content: content,
            files: files,
            notice_type: notice_type
        }
    );
    return query.update_info_notice.id ?? null;
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
    return query.insert_info_notice.id ?? null;
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