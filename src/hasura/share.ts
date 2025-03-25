import { gql } from "graphql-request";
import { client } from "..";

type WeeklyPost = {
    id: number;
    title: string;
    url: string;
    date: Date;
  }
export { WeeklyPost };
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
 * Add course
 * @param {number} year - Year of the course
 * @param {string} type - Type of the course
 * @param {string} semester - Semester of the course
 * @param {string} professor - Professor of the course
 * @param {string} name - Name of the course
 * @param {string} language - Language of the course
 * @param {string} fullname - Full name of the course
 * @param {string} code - Course code
 * @returns {Promise<string | undefined>} - The UUID of the new course
 */
export const add_course = async(year: number, type: string, semester: string, professor: string, name: string, language: string, fullname: string, code: string): Promise<string | undefined> => {
    const add_course_query: { insert_course?: { returning: { uuid: string }[] } } = await client.request(
        gql`
        mutation AddCourse(
            $year: Int!,
            $type: String!,
            $semester: String!,
            $professor: String!,
            $name: String!,
            $language: String!,
            $fullname: String!,
            $code: String!
        ) {
            insert_course(
                objects: {
                    code: $code,
                    fullname: $fullname,
                    language: $language,
                    name: $name,
                    professor: $professor,
                    semester: $semester,
                    type: $type,
                    year: $year
                }
            ) {
                returning {
                    uuid
                }
            }
        }`,
        {
            year: year,
            type: type,
            semester: semester,
            professor: professor,
            name: name,
            language: language,
            fullname: fullname,
            code: code
        }
    );
    return add_course_query?.insert_course?.returning[0]?.uuid;
}



/**
 * Add course info
 * @param {string} key - The key to add
 * @param {string} value - The value to add
 * @param {string} course_id - The UUID of the course
 * @returns {Promise<string | undefined>} - The UUID of the added course
 */
export const add_course_info = async(key: string, value: string, course_id: string): Promise<string | undefined> => {
    const add_course_info_query: { insert_course_info_one?: { course_id: string } } = await client.request(
        gql`
        mutation AddCourseInfo($key: String!, $value: String!, $course_id: uuid!) {
            insert_course_info_one(object: {key: $key, value: $value, course_id: $course_id}) {
                course_id
            }
        }`,
        {
            key: key,
            value: value,
            course_id: course_id
        }
    );
    return add_course_info_query?.insert_course_info_one?.course_id;
}

/**
 * Add course rating
 * @param {number} dim1 - Dimension 1 rating
 * @param {number} dim2 - Dimension 2 rating
 * @param {number} dim3 - Dimension 3 rating
 * @param {number} dim4 - Dimension 4 rating
 * @param {number} dim5 - Dimension 5 rating
 * @param {number} dim6 - Dimension 6 rating
 * @param {string} course_id - The UUID of the course
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<string | undefined>} - The creation timestamp of the new rating
 */
export const add_course_rating = async(dim1: number, dim2: number, dim3: number, dim4: number, dim5: number, dim6: number, course_id: string, user_uuid: string): Promise<string | undefined> => {
    const add_course_rating_query: { insert_course_rating_one?: { created_at: string } } = await client.request(
        gql`
        mutation AddCourseRating(
            $dim1: Int!,
            $dim2: Int!,
            $dim3: Int!,
            $dim4: Int!,
            $dim5: Int!,
            $dim6: Int!,
            $course_id: uuid!,
            $user_uuid: uuid!
        ) {
            insert_course_rating_one(object: {
                dim1: $dim1,
                dim2: $dim2,
                dim3: $dim3,
                dim4: $dim4,
                dim5: $dim5,
                dim6: $dim6,
                course_id: $course_id,
                user_uuid: $user_uuid
            }) {
                created_at
            }
        }`,
        {
            dim1: dim1,
            dim2: dim2,
            dim3: dim3,
            dim4: dim4,
            dim5: dim5,
            dim6: dim6,
            course_id: course_id,
            user_uuid: user_uuid
        }
    );
    return add_course_rating_query?.insert_course_rating_one?.created_at;
}

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
 * Update course
 * @param {string} code - Course code
 * @param {string} uuid - Course UUID
 * @param {string} fullname - Full name of the course
 * @param {string} language - Language of the course
 * @param {string} name - Name of the course
 * @param {string} professor - Professor of the course
 * @param {string} semester - Semester of the course
 * @param {string} type - Type of the course
 * @param {number} year - Year of the course
 * @returns {Promise<string | undefined>} - The UUID of the updated course
 */
export const update_course = async(code: string, uuid: string, fullname: string, language: string, name: string, professor: string, semester: string, type: string, year: number): Promise<string | undefined> => {
    const update_course_query: { update_course_by_pk?: { uuid: string } } = await client.request(
        gql`
        mutation UpdateCourse(
            $code: String!,
            $uuid: uuid!,
            $fullname: String!,
            $language: String!,
            $name: String!,
            $professor: String!,
            $semester: String!,
            $type: String!,
            $year: Int!
        ) {
            update_course_by_pk(
                pk_columns: {uuid: $uuid},
                _set: {
                    code: $code,
                    fullname: $fullname,
                    language: $language,
                    name: $name,
                    professor: $professor,
                    semester: $semester,
                    type: $type,
                    year: $year
                }
            ) {
                uuid
            }
        }`,
        {
            code: code,
            uuid: uuid,
            fullname: fullname,
            language: language,
            name: name,
            professor: professor,
            semester: semester,
            type: type,
            year: year
        }
    );
    return update_course_query?.update_course_by_pk?.uuid;
}


/**
 * Update course info
 * @param {string} course_id - The UUID of the course
 * @param {string} key - The key to update
 * @param {string} value - The new value
 * @returns {Promise<string | undefined>} - The UUID of the updated course
 */
export const update_course_info = async(course_id: string, key: string, value: string): Promise<string | undefined> => {
    const update_course_info_query: { update_course_info_by_pk?: { course_id: string } } = await client.request(
        gql`
        mutation UpdateCourseInfo($course_id: uuid!, $key: String!, $value: String!) {
            update_course_info_by_pk(pk_columns: {course_id: $course_id, key: $key}, _set: {value: $value}) {
                course_id
            }
        }`,
        {
            course_id: course_id,
            key: key,
            value: value
        }
    );
    return update_course_info_query?.update_course_info_by_pk?.course_id;
}

/**
 * Update course rating
 * @param {string} course_id - The UUID of the course
 * @param {string} user_uuid - The UUID of the user
 * @param {number} dim1 - Dimension 1 rating
 * @param {number} dim2 - Dimension 2 rating
 * @param {number} dim3 - Dimension 3 rating
 * @param {number} dim4 - Dimension 4 rating
 * @param {number} dim5 - Dimension 5 rating
 * @param {number} dim6 - Dimension 6 rating
 * @returns {Promise<string | undefined>} - The update timestamp of the rating
 */
export const update_course_rating = async(course_id: string, user_uuid: string, dim1: number, dim2: number, dim3: number, dim4: number, dim5: number, dim6: number): Promise<string | undefined> => {
    const update_course_rating_query: { update_course_rating_by_pk?: { updated_at: string } } = await client.request(
        gql`
        mutation UpdateCourseRating(
            $course_id: uuid!,
            $user_uuid: uuid!,
            $dim1: Int!,
            $dim2: Int!,
            $dim3: Int!,
            $dim4: Int!,
            $dim5: Int!,
            $dim6: Int!
        ) {
            update_course_rating_by_pk(
                pk_columns: {
                    course_id: $course_id,
                    user_uuid: $user_uuid
                },
                _set: {
                    dim1: $dim1,
                    dim2: $dim2,
                    dim3: $dim3,
                    dim4: $dim4,
                    dim5: $dim5,
                    dim6: $dim6
                }
            ) {
                updated_at
            }
        }`,
        {
            course_id: course_id,
            user_uuid: user_uuid,
            dim1: dim1,
            dim2: dim2,
            dim3: dim3,
            dim4: dim4,
            dim5: dim5,
            dim6: dim6
        }
    );
    return update_course_rating_query?.update_course_rating_by_pk?.updated_at;
}

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
 * Delete course
 * @param {string} uuid - Course UUID
 * @returns {Promise<string | undefined>} - The UUID of the deleted course
 */
export const delete_course = async(uuid: string): Promise<string | undefined> => {
    const delete_course_query: { delete_course_by_pk?: { uuid: string } } = await client.request(
        gql`
        mutation DeleteCourse($uuid: uuid!) {
            delete_course_by_pk(uuid: $uuid) {
                uuid
            }
        }`,
        {
            uuid: uuid
        }
    );
    return delete_course_query?.delete_course_by_pk?.uuid;
}


  /**
 * Delete course info
 * @param {string} course_id - The UUID of the course
 * @param {string} key - The key to delete
 * @returns {Promise<{ course_id: string, key: string } | undefined>} - The UUID and key of the deleted course info
 */
export const delete_course_info = async(course_id: string, key: string): Promise<{ course_id: string, key: string } | undefined> => {
    const delete_course_info_query: { delete_course_info_by_pk?: { course_id: string, key: string } } = await client.request(
        gql`
        mutation MyMutation3($course_id: uuid!, $key: String!) {
            delete_course_info_by_pk(course_id: $course_id, key: $key) {
                course_id
                key
            }
        }`,
        {
            course_id: course_id,
            key: key
        }
    );
    return delete_course_info_query?.delete_course_info_by_pk;
}

/**
 * Delete course rating
 * @param {string} course_id - The UUID of the course
 * @param {string} user_uuid - The UUID of the user
 * @returns {Promise<{ course_id: string, user_uuid: string } | undefined>} - The UUIDs of the deleted course rating
 */
export const delete_course_rating = async(course_id: string, user_uuid: string): Promise<{ course_id: string, user_uuid: string } | undefined> => {
    const delete_course_rating_query: { delete_course_rating_by_pk?: { course_id: string, user_uuid: string } } = await client.request(
        gql`
        mutation DeleteCourseRating($course_id: uuid!, $user_uuid: uuid!) {
            delete_course_rating_by_pk(course_id: $course_id, user_uuid: $user_uuid) {
                course_id
                user_uuid
            }
        }`,
        {
            course_id: course_id,
            user_uuid: user_uuid
        }
    );
    return delete_course_rating_query?.delete_course_rating_by_pk;
}

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

export const get_newest_weekly = async(): Promise<Date> => {
    const get_newest_weekly_query: any = await client.request(
        gql`
        query MyQuery {
          weekly_aggregate {
            aggregate {
              max {
                date
              }
            }
          }
        }
`
    );
    const date = get_newest_weekly_query?.weekly_aggregate?.aggregate?.max?.date + "T00:00:00.000+08:00";
    return new Date(date);
}
/**
 * 
 * mutation MyMutation($date: date = "", $title: String = "", $url: String = "") {
  insert_weekly(objects: {date: $date, title: $title, url: $url}) {
    returning {
      id
    }
  }
}

 */
export const add_weekly_list = async(weekly_list: WeeklyPost[]): Promise<string | undefined> => {
    const add_weekly_list_query: any = await client.request(
        gql`
        mutation MyMutation($objects: [weekly_insert_input!]!) {
            insert_weekly(objects: $objects) {
              returning {
                id
              }
            }
          }
`,
        {
            objects: weekly_list
        }
    );
    return add_weekly_list_query?.insert_weekly?.returning;
}

export const get_newest_weekly_id = async(): Promise<number> => {
    const get_newest_weekly_id_query: any = await client.request(
        gql`
       query MyQuery {
          weekly_aggregate {
            aggregate {
              max {
                id
              }
            }
          }
        } 
`
    );
    return get_newest_weekly_id_query?.weekly_aggregate?.aggregate?.max?.id;
}
