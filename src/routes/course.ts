import express from "express";
import authenticate from "../middlewares/authenticate";
import * as CrsHasFunc from "../hasura/course";
import * as COS from "../helpers/cos";

const router = express.Router();

interface Comment {
  comment: string;
  created_at: string;
  updated_at: string;
  uuid: string;
  user_uuid: string;
  parent_uuid?: string;
  username?: string;
  display: boolean;
  // deleted: boolean;
  stars: number;
  likes: number;
  stared: boolean;
  liked: boolean;
  replies: string[];
  avatar_url: string;
}

/*
  body: {
      course_uuid: string;
  }
*/

router.get("/is_manager", authenticate([]), async (req, res) => {
  try {
    const current_user_uuid = req.auth.user.uuid;
    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(current_user_uuid);
    res.status(200).json({ is_manager: is_manager });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

router.get("/comments/:course_uuid", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const current_user_uuid = req.auth.user.uuid;
    const course_uuid = req.params.course_uuid;
    const course_comments_raw = await CrsHasFunc.get_course_comments(course_uuid);

    const comment_stared = await CrsHasFunc.get_course_comments_stared(current_user_uuid, course_uuid);
    const comment_liked = await CrsHasFunc.get_course_comments_liked(current_user_uuid, course_uuid);

    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(current_user_uuid);

    const course_comments_filtered = course_comments_raw.filter((comment: any) => !comment.deleted && (is_manager || comment.display || comment.user_uuid === current_user_uuid));

    const cos = await COS.initCOS();
    const config = await COS.getConfig();

    const course_comments: Comment[] = [];

    const promises = course_comments_filtered.map(async (comment: any) => {
      const stars = await CrsHasFunc.get_course_comment_stars(comment.uuid);
      const likes = await CrsHasFunc.get_course_comment_likes(comment.uuid);
      const stared = comment_stared.includes(comment.uuid);
      const liked = comment_liked.includes(comment.uuid);
      const replies = course_comments_filtered.filter((reply: any) => reply.parent_uuid === comment.uuid).map((reply: any) => reply.uuid);

      const user_files = await COS.listFile(`avatar/${comment.user_uuid}/`, cos, config);
      const image_files = user_files.filter((file) => /\.(jpe?g|png)$/i.test(file.Key));
      let avatar_url = `https://api.dicebear.com/9.x/thumbs/svg?scale=80&backgroundType=gradientLinear&seed=${comment.user_uuid}`;
      if (image_files.length > 0) {
        const firstImage = image_files[0];
        avatar_url = await COS.getAvatarUrl(firstImage.Key, cos, config);
      }

      return {
        comment: comment.comment,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        uuid: comment.uuid,
        user_uuid: comment.user_uuid,
        parent_uuid: comment.parent_uuid,
        username: comment.user.username,
        display: comment.display,
        stars: stars,
        likes: likes,
        stared: stared,
        liked: liked,
        replies: replies,
        avatar_url: avatar_url
      };
    });

    const result = await Promise.all(promises);
    course_comments.push(...result.filter(comment => comment !== null));

    res.status(200).json({ course_comments: course_comments });

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


router.post("/comments/batch_display", authenticate(), async (req, res) => {
  try {
    const current_user_uuid = req.auth.user.uuid;
    const course_uuid = req.body.course_uuid;
    const display = req.body.display;

    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(current_user_uuid);

    if (!is_manager) {
      res.status(403).json({ error: "403 Forbidden", message: "Permission denied" });
      return;
    }

    await CrsHasFunc.display_course_comments_batch(course_uuid, display);
    res.status(200).json({ message: "Comment display updated in batch" });

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


router.post("/comments/display", authenticate(), async (req, res) => {
  try {
    const current_user_uuid = req.auth.user.uuid;
    const comment_uuid = req.body.comment_uuid;
    const display = req.body.display;

    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(current_user_uuid);

    if (!is_manager) {
      res.status(403).json({ error: "403 Forbidden", message: "Permission denied" });
      return;
    }

    await CrsHasFunc.display_course_comment(comment_uuid, display);
    res.status(200).json({ message: "Comment display updated" });

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


router.post("/comments/add", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const comment: string = req.body.comment;
    const user_uuid: string = req.auth.user.uuid;
    const course_uuid: string = req.body.course_uuid;
    const parent_uuid: string | undefined = req.body.parent_uuid ?? undefined;
    const display: boolean = false;

    const comment_info = await CrsHasFunc.add_course_comment(
      comment,
      user_uuid,
      course_uuid,
      parent_uuid,
      display
    );


    const cos = await COS.initCOS();
    const config = await COS.getConfig();

    const user_files = await COS.listFile(`avatar/${user_uuid}/`, cos, config);
    const image_files = user_files.filter((file) => /\.(jpe?g|png)$/i.test(file.Key));
    let avatar_url = `https://api.dicebear.com/9.x/thumbs/svg?scale=80&backgroundType=gradientLinear&seed=${user_uuid}`;
    if (image_files.length > 0) {
      const firstImage = image_files[0];
      avatar_url = await COS.getAvatarUrl(firstImage.Key, cos, config);
    }

    const comment_detail: Comment = {
      comment: comment,
      created_at: comment_info.created_at,
      updated_at: comment_info.updated_at,
      uuid: comment_info.uuid,
      user_uuid: user_uuid,
      parent_uuid: parent_uuid,
      username: req.auth.user.username,
      display: display,
      stars: 0,
      likes: 0,
      stared: false,
      liked: false,
      replies: [],
      avatar_url: avatar_url
    };

    res.status(200).json({ comment: comment_detail });

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

router.post("/comments/update", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const comment_uuid = req.body.comment_uuid;
    const comment = req.body.comment;

    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(user_uuid);

    const display = is_manager;  // 管理员修改的评论自动精选，否则自动隐藏

    if (!is_manager) {
      const comment_info = await CrsHasFunc.query_course_comment(comment_uuid, user_uuid);
      if (!comment_info) {
        res.status(403).json({ error: "403 Forbidden", message: "Permission denied" });
        return;
      } else if (comment_info.deleted) {
        res.status(403).json({ error: "403 Forbidden", message: "Comment deleted" });
        return;
      }
    }

    const updated_at = await CrsHasFunc.update_course_comment(comment, comment_uuid, display);

    res.status(200).json({ display: display, updated_at: updated_at });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


router.post("/comments/delete", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const user_uuid = req.auth.user.uuid;
    const comment_uuid = req.body.comment_uuid;

    const course_managers = await CrsHasFunc.get_course_manager();
    const is_manager = course_managers.includes(user_uuid);

    if (!is_manager) {
      const comment_info = await CrsHasFunc.query_course_comment(comment_uuid, user_uuid);
      if (!comment_info) {
        res.status(403).json({ error: "403 Forbidden", message: "Permission denied" });
        return;
      }
    }

    await CrsHasFunc.delete_course_comment(comment_uuid);
    res.status(200).json({ message: "Comment deleted" });
  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});



router.post("/comments/stars/toggle", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const comment_uuid: string = req.body.comment_uuid;
    const user_uuid: string = req.auth.user.uuid;
    const stared: boolean = req.body.stared;

    if (stared) {
      await CrsHasFunc.add_course_comment_star(comment_uuid, user_uuid);
      res.status(200).json({ message: "Star added" });
    } else {
      await CrsHasFunc.delete_course_comment_star(comment_uuid, user_uuid);
      res.status(201).json({ message: "Star deleted" });
    }

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


router.post("/comments/likes/toggle", authenticate(["student", "counselor"]), async (req, res) => {
  try {
    const comment_uuid: string = req.body.comment_uuid;
    const user_uuid: string = req.auth.user.uuid;
    const liked: boolean = req.body.liked;

    if (liked) {
      await CrsHasFunc.add_course_comment_like(comment_uuid, user_uuid);
      res.status(200).json({ message: "Like added" });
    } else {
      await CrsHasFunc.delete_course_comment_like(comment_uuid, user_uuid);
      res.status(201).json({ message: "Like deleted" });
    }

  } catch (err: any) {
    res.status(500).json({
      error: "500 Internal Server Error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});


export default router;
