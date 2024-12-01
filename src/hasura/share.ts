import { gql } from "graphql-request";
import { client } from "..";

/**
  ============================================================================
  ============================ QUERY FUNCTIONS ===============================
  ============================================================================
 */

/**
  ============================================================================
  ============================ INSERT FUNCTIONS ==============================
  ============================================================================
 */

  /**
 * Add a course comment
 * @param {string} comment - The content of the comment
 * @param {string} user_uuid - The UUID of the user
 * @param {string} course_uuid - The UUID of the course
 * @param {string} parent_uuid - The UUID of the parent comment
 * @returns {Promise<string | undefined>} - The UUID of the new comment
 */
export const add_course_comment_one = async(comment: string, user_uuid: string, course_uuid: string, parent_uuid: string): Promise<string | undefined> => {
    const add_course_comment_one_query: { insert_course_comment_one?: { uuid: string } } = await client.request(
        gql`
        mutation AddCourseCommentOne(
            $comment: String!
            $user_uuid: uuid!
            $course_uuid: uuid!
            $parent_uuid: uuid
        ) {
            insert_course_comment_one(
            object: {
                comment: $comment
                course_id: $course_uuid
                user_uuid: $user_uuid
                parent_uuid: $parent_uuid
            }
            ) {
            uuid
            }
        }`,
    {
        comment: comment,
        user_uuid: user_uuid,
        course_uuid: course_uuid,
        parent_uuid: parent_uuid
    }
    );
    return add_course_comment_one_query?.insert_course_comment_one?.uuid;
}

/**
 * Add stars to a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string | undefined>} - The UUID of the comment
 */
export const add_course_comment_stars = async(comment_uuid: string, user_uuid: string): Promise<string | undefined> => {
    const add_course_comment_stars_query: { insert_course_comment_stars_one?: { comment_uuid: string } } = await client.request(
        gql`
        mutation AddCourseCommentStars($comment_uuid: uuid!, $user_uuid: uuid!) {
            insert_course_comment_stars_one(
                object: { comment_uuid: $comment_uuid, user_uuid: $user_uuid }
                on_conflict: { constraint: course_comment_star_pkey, update_columns: [] }
            ) {
            comment_uuid
            }
        }`,
        {
            comment_uuid: comment_uuid,
            user_uuid: user_uuid
        }
    );
    return add_course_comment_stars_query?.insert_course_comment_stars_one?.comment_uuid;
}


/**
 * Add likes to a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string | undefined>} - The UUID of the comment
 */
export const add_course_comment_likes = async(comment_uuid: string, user_uuid: string): Promise<string | undefined> => {
    const add_course_comment_likes_query: { insert_course_comment_likes_one?: { comment_uuid: string } } = await client.request(
        gql`
        mutation AddCourseCommentLikes($comment_uuid: uuid!, $user_uuid: uuid!) {
            insert_course_comment_likes_one(
                object: { comment_uuid: $comment_uuid, user_uuid: $user_uuid }
                on_conflict: { constraint: course_comment_likes_pkey, update_columns: [] }
            ) {
            comment_uuid
            }
        }`,
        {
            comment_uuid: comment_uuid,
            user_uuid: user_uuid
        }
    );
    return add_course_comment_likes_query?.insert_course_comment_likes_one?.comment_uuid;
}

/**
  ============================================================================
  ============================ UPDATE FUNCTIONS ==============================
  ============================================================================
 */

  /**
 * Update a course comment
 * @param {string} comment - The new content of the comment
 * @param {string} uuid - The UUID of the comment
 * @returns {Promise<string | undefined>} - The UUID of the updated comment
 */
export const update_course_comment = async (comment: string, uuid: string): Promise<string | undefined> => {
    const update_course_comment_query: any = await client.request(
        gql`
        mutation UpdateCourseComment($comment: String!, $uuid: uuid!) {
            update_course_comment_by_pk(
            pk_columns: { uuid: $uuid }
            _set: { comment: $comment }
            ) {
            uuid
            }
        }`,
        {
            uuid: uuid,
            comment: comment
        }
    );
    return update_course_comment_query?.update_course_comment_by_pk?.uuid;
}

/**
  ============================================================================
  ============================ DELETE FUNCTIONS ==============================
  ============================================================================
 */

/**
 * Soft delete a course comment
 * @param {string} uuid - The UUID of the comment
 * @returns {Promise<string | undefined>} - The UUID of the deleted comment
 */
export const delete_course_comment_one = async (uuid: string): Promise<string | undefined> => {
    const delete_course_comment_one_query: { update_course_comment_by_pk?: { uuid: string } } = await client.request(
        gql`
        mutation DeleteCourseCommentOne($uuid: uuid!) {
            update_course_comment_by_pk(
                pk_columns: { uuid: $uuid }
                _set: { deleted: true }
            ) {
                uuid
            }
        }`,
        {
            uuid: uuid
        }
    );
    return delete_course_comment_one_query?.update_course_comment_by_pk?.uuid;
}

/**
 * Delete stars from a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string | undefined>} - The UUID of the comment
 */
export const delete_course_comment_stars = async (comment_uuid: string, user_uuid: string): Promise<string | undefined> => {
    const delete_course_comment_stars_query: { delete_course_comment_stars_by_pk?: { comment_uuid: string } } = await client.request(
        gql`
        mutation DeleteCourseCommentStars($comment_uuid: uuid!, $user_uuid: uuid!) {
            delete_course_comment_stars_by_pk(
            comment_uuid: $comment_uuid
            user_uuid: $user_uuid
            ) {
            comment_uuid
            }
        }`,
        {
            comment_uuid: comment_uuid,
            user_uuid: user_uuid
        }
    );
    return delete_course_comment_stars_query?.delete_course_comment_stars_by_pk?.comment_uuid;
}

/**
 * Delete likes from a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string | undefined>} - The UUID of the comment
 */
export const delete_course_comment_likes = async(comment_uuid: string, user_uuid: string): Promise<string | undefined> => {
    const delete_course_comment_likes_query: { delete_course_comment_likes_by_pk?: { comment_uuid: string } } = await client.request(
        gql`
        mutation DeleteCourseCommentLikes($comment_uuid: uuid!, $user_uuid: uuid!) {
            delete_course_comment_likes_by_pk(
            comment_uuid: $comment_uuid
            user_uuid: $user_uuid
            ) {
            comment_uuid
            }
        }`,
        {
            comment_uuid: comment_uuid,
            user_uuid: user_uuid
        }
    );
    return delete_course_comment_likes_query?.delete_course_comment_likes_by_pk?.comment_uuid;
}