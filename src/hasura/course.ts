import { gql } from "graphql-request";
import { client } from "..";


/**
 * Get course manager
 * @returns {Promise<any>} - The course manager
 */
export const get_course_manager = async (): Promise<any> => {
  const get_course_manager_query: { course_manager: any } = await client.request(
    gql`
      query GetCourseManager {
          course_manager {
              user_uuid
          }
      }`
  );
  return get_course_manager_query.course_manager.map((manager: any) => manager.user_uuid);
}


/**
* Get course comments
* @param {string} course_uuid - The UUID of the course
* @returns {Promise<any>} - The comments of the course
*/
export const get_course_comments = async (course_uuid: string): Promise<any> => {
  const get_course_comments_query: { course_comment: any } = await client.request(
    gql`
      query GetCourseComments($course_uuid: uuid!) {
          course_comment(
              order_by: { created_at: desc },
              where: { course_id: { _eq: $course_uuid } }
          ) {
              comment
              created_at
              updated_at
              uuid
              user_uuid
              parent_uuid
              user {
                  username
              }
              display
              deleted
          }
      }`,
    {
      course_uuid: course_uuid
    }
  );
  return get_course_comments_query.course_comment;
}


/**
* Get stars from a course comment
* @param {string} comment_uuid - The UUID of the comment
* @returns {Promise<any>} - The stars of the comment
*/
export const get_course_comment_stars = async (comment_uuid: string): Promise<any> => {
  const get_course_comment_stars_query: { course_comment_stars_aggregate: any } = await client.request(
    gql`
      query GetCourseCommentStars($comment_uuid: uuid!) {
          course_comment_stars_aggregate(
              where: { comment_uuid: { _eq: $comment_uuid } }
          ) {
              aggregate {
                  count
              }
          }
      }`,
    {
      comment_uuid: comment_uuid
    }
  );
  return get_course_comment_stars_query.course_comment_stars_aggregate.aggregate.count;
}


/**
* Get likes from a course comment
* @param {string} comment_uuid - The UUID of the comment
* @returns {Promise<any>} - The likes of the comment
*/
export const get_course_comment_likes = async (comment_uuid: string): Promise<any> => {
  const get_course_comment_likes_query: { course_comment_likes_aggregate: any } = await client.request(
    gql`
      query GetCourseCommentLikes($comment_uuid: uuid!) {
          course_comment_likes_aggregate(
              where: { comment_uuid: { _eq: $comment_uuid } }
          ) {
              aggregate {
                  count
              }
          }
      }`,
    {
      comment_uuid: comment_uuid
    }
  );
  return get_course_comment_likes_query.course_comment_likes_aggregate.aggregate.count;
}


/**
* Get comments stared by a user
* @param {string} user_uuid - The UUID of the user
* @param {string} course_uuid - The UUID of the course
* @returns {Promise<any>} - The comments stared by the user
*/
export const get_course_comments_stared = async (user_uuid: string, course_uuid: string): Promise<any> => {
  const get_course_comments_stared_query: { course_comment_stars: any } = await client.request(
    gql`
      query GetCourseCommentsStared($user_uuid: uuid!, $course_uuid: uuid!) {
          course_comment_stars(
              where: {
                  user_uuid: { _eq: $user_uuid }
                  course_comment: { course_id: { _eq: $course_uuid } }
              },
              order_by: { course_comment: { created_at: desc } }
          ) {
              comment_uuid
          }
      }`,
    {
      user_uuid: user_uuid,
      course_uuid: course_uuid
    }
  );
  return get_course_comments_stared_query.course_comment_stars.map((star: any) => star.comment_uuid);
}


/**
* Get comments liked by a user
* @param {string} user_uuid - The UUID of the user
* @param {string} course_uuid - The UUID of the course
* @returns {Promise<any>} - The comments liked by the user
*/
export const get_course_comments_liked = async (user_uuid: string, course_uuid: string): Promise<any> => {
  const get_course_comments_liked_query: { course_comment_likes: any } = await client.request(
    gql`
      query GetCourseCommentsLiked($user_uuid: uuid!, $course_uuid: uuid!) {
          course_comment_likes(
              where: {
                  user_uuid: { _eq: $user_uuid }
                  course_comment: { course_id: { _eq: $course_uuid } }
              },
              order_by: { course_comment: { created_at: desc } }
          ) {
              comment_uuid
          }
      }`,
    {
      user_uuid: user_uuid,
      course_uuid: course_uuid
    }
  );
  return get_course_comments_liked_query.course_comment_likes.map((like: any) => like.comment_uuid);
}



/**
 * Display course comments
 * @param {string} course_uuid - The UUID of the course
 * @param {boolean} display - Whether to display the comments
 * @returns {Promise<any>} - The affected rows
 */

export const display_course_comments_batch = async (course_uuid: string, display: boolean): Promise<any> => {
  const display_course_comments_batch_mutation: { update_course_comment: any } = await client.request(
    gql`
      mutation DisplayCourseCommentsBatch($course_uuid: uuid!, $display: Boolean!) {
          update_course_comment(
              where: {
                  course_id: { _eq: $course_uuid }
                  deleted: { _eq: false }
              },
              _set: { display: $display }
          ) {
              affected_rows
          }
      }`,
    {
      course_uuid: course_uuid,
      display: display
    }
  );
  return display_course_comments_batch_mutation.update_course_comment.affected_rows;
}


/**
 * Display a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {boolean} display - Whether to display the comment
 * @returns {Promise<any>} - The UUID of the comment
 */

export const display_course_comment = async (comment_uuid: string, display: boolean): Promise<any> => {
  const display_course_comment_mutation: { update_course_comment_by_pk: any } = await client.request(
    gql`
      mutation DisplayCourseComment($comment_uuid: uuid!, $display: Boolean!) {
          update_course_comment_by_pk(
              pk_columns: { uuid: $comment_uuid },
              _set: { display: $display }
          ) {
              uuid
          }
      }`,
    {
      comment_uuid: comment_uuid,
      display: display
    }
  );
  return display_course_comment_mutation.update_course_comment_by_pk.uuid;
}



/**
 * Add a course comment
 * @param {string} comment - The content of the comment
 * @param {string} user_uuid - The UUID of the user
 * @param {string} course_uuid - The UUID of the course
 * @param {string | undefined} parent_uuid - The UUID of the parent comment
 * @param {boolean} display - Whether to display the comment
 * @returns {Promise<string>} - The UUID of the new comment
*/
export const add_course_comment = async (
  comment: string,
  user_uuid: string,
  course_uuid: string,
  parent_uuid: string | undefined,
  display: boolean
): Promise<{ created_at: string, updated_at: string, uuid: string }> => {
  const add_course_comment_query: { insert_course_comment_one: { created_at: string, updated_at: string, uuid: string } } = await client.request(
    gql`
        mutation AddCourseComment(
            $comment: String!
            $user_uuid: uuid!
            $course_uuid: uuid!
            $parent_uuid: uuid
            $display: Boolean!
        ) {
            insert_course_comment_one(
              object: {
                  comment: $comment
                  course_id: $course_uuid
                  user_uuid: $user_uuid
                  parent_uuid: $parent_uuid
                  display: $display
              }
            ) {
              created_at
              updated_at
              uuid
            }
        }`,
    {
      comment: comment,
      user_uuid: user_uuid,
      course_uuid: course_uuid,
      parent_uuid: parent_uuid,
      display: display
    }
  );
  return add_course_comment_query.insert_course_comment_one;
}


/**
 * Update a course comment
 * @param {string} comment - The new content of the comment
 * @param {string} comment_uuid - The UUID of the comment
 * @returns {Promise<string>} - The UUID of the updated comment
 */
export const update_course_comment = async (
  comment: string,
  comment_uuid: string,
  display: boolean
): Promise<string> => {
  const update_course_comment_query: any = await client.request(
    gql`
        mutation UpdateCourseComment($comment: String!, $comment_uuid: uuid!, $display: Boolean!) {
            update_course_comment_by_pk(
              pk_columns: { uuid: $comment_uuid }
              _set: {
                comment: $comment
                display: $display
              }
            ) {
              updated_at
            }
        }`,
    {
      comment_uuid: comment_uuid,
      comment: comment,
      display: display
    }
  );
  return update_course_comment_query.update_course_comment_by_pk?.updated_at;
}


/**
 * Soft delete a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @returns {Promise<string>} - The UUID of the deleted comment
 */
export const delete_course_comment = async (
  comment_uuid: string
): Promise<string | undefined> => {
  const delete_course_comment_one_query: { update_course_comment_by_pk: { uuid: string } } = await client.request(
      gql`
      mutation DeleteCourseCommentOne($comment_uuid: uuid!) {
          update_course_comment_by_pk(
              pk_columns: { uuid: $comment_uuid }
              _set: { deleted: true }
          ) {
              uuid
          }
      }`,
      {
        comment_uuid: comment_uuid
      }
  );
  return delete_course_comment_one_query.update_course_comment_by_pk?.uuid;
}


/**
 * Add star to a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */
export const add_course_comment_star = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const add_course_comment_stars_query: { insert_course_comment_stars_one: { comment_uuid: string } } = await client.request(
    gql`
      mutation AddCourseCommentStar($comment_uuid: uuid!, $user_uuid: uuid!) {
          insert_course_comment_stars_one(
              object: {
                comment_uuid: $comment_uuid,
                user_uuid: $user_uuid
              }
              on_conflict: {
                constraint: course_comment_star_pkey,
                update_columns: []
              }
          ) {
            comment_uuid
          }
      }`,
    {
      comment_uuid: comment_uuid,
      user_uuid: user_uuid
    }
  );
  return add_course_comment_stars_query.insert_course_comment_stars_one?.comment_uuid;
}


/**
 * Add like to a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */
export const add_course_comment_like = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const add_course_comment_likes_query: { insert_course_comment_likes_one: { comment_uuid: string } } = await client.request(
    gql`
      mutation AddCourseCommentLikes($comment_uuid: uuid!, $user_uuid: uuid!) {
          insert_course_comment_likes_one(
              object: {
                comment_uuid: $comment_uuid,
                user_uuid: $user_uuid
              }
              on_conflict: {
                constraint: course_comment_likes_pkey,
                update_columns: []
              }
          ) {
            comment_uuid
          }
      }`,
    {
      comment_uuid: comment_uuid,
      user_uuid: user_uuid
    }
  );
  return add_course_comment_likes_query.insert_course_comment_likes_one?.comment_uuid;
}




/**
 * Delete star from a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */
export const delete_course_comment_star = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const delete_course_comment_stars_query: { delete_course_comment_stars_by_pk: { comment_uuid: string } } = await client.request(
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
  return delete_course_comment_stars_query.delete_course_comment_stars_by_pk?.comment_uuid;
}


/**
 * Delete like from a course comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */
export const delete_course_comment_like = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const delete_course_comment_likes_query: { delete_course_comment_likes_by_pk: { comment_uuid: string } } = await client.request(
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
  return delete_course_comment_likes_query.delete_course_comment_likes_by_pk?.comment_uuid;
}

/**
 * Query if a user has stared a comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */

export const query_course_comment_star = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const query_course_comment_star_query: { course_comment_stars_by_pk: { comment_uuid: string } } = await client.request(
    gql`
      query QueryCourseCommentStar($comment_uuid: uuid!, $user_uuid: uuid!) {
          course_comment_stars_by_pk(
              comment_uuid: $comment_uuid,
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
  return query_course_comment_star_query.course_comment_stars_by_pk?.comment_uuid;
}


/**
 * Query if a user has liked a comment
 * @param {string} comment_uuid - The UUID of the comment
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string>} - The UUID of the comment
 */

export const query_course_comment_like = async (
  comment_uuid: string,
  user_uuid: string
): Promise<string> => {
  const query_course_comment_like_query: { course_comment_likes_by_pk: { comment_uuid: string } } = await client.request(
    gql`
      query QueryCourseCommentLike($comment_uuid: uuid!, $user_uuid: uuid!) {
          course_comment_likes_by_pk(
              comment_uuid: $comment_uuid,
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
  return query_course_comment_like_query.course_comment_likes_by_pk?.comment_uuid;
}


export const query_course_comment = async (
  comment_uuid: string,
  user_uuid: string
): Promise<any> => {
  const query_course_comment_query: { course_comment: any } = await client.request(
    gql`
      query QueryCourseComment($comment_uuid: uuid!, $user_uuid: uuid!) {
          course_comment(
              where: {uuid: {_eq: $comment_uuid}, user_uuid: {_eq: $user_uuid}}
          ) {
              deleted
          }
      }`,
    {
      comment_uuid: comment_uuid,
      user_uuid: user_uuid
    }
  );
  return query_course_comment_query.course_comment?.[0];
}
