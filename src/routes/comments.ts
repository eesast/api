import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Comment from "../models/comment";

const router = express.Router();

/**
 * GET comments with queries
 * @param {number} replyTo
 * @param {number} likedBy
 * @param {number} articleId
 * @param {number} authorId
 * @returns {Object[]} certain articles
 */
router.get("/", (req, res) => {
  const query: any = {};
  if (req.query.replyTo) {
    query.replyTo = req.query.replyTo;
  }
  if (req.query.articleId) {
    query.articleId = req.query.articleId;
  }
  if (req.query.authorId) {
    query.authorId = req.query.authorId;
  }
  if (req.query.likedBy) {
    query.likers = req.query.likedBy;
  }
  req.query.available = true;

  Comment.find(query, "-_id -__v", (err, comments) => {
    if (err) {
      return res.status(500).end();
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(comments));
  });
});

/**
 * GET a comment of Id
 * @param {number} id
 * @returns {Object} comment with id
 */
router.get("/:id", (req, res) => {
  Comment.findOne(
    { id: req.params.id, available: true },
    "-_id -__v",
    (err, comment) => {
      if (err) {
        return res.status(500).end();
      }
      if (!comment) {
        return res.status(404).send("404 Not Found: Comment does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(comment));
    }
  );
});

/**
 * Set likers of the comment of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/like", authenticate([]), (req, res) => {
  Comment.findOneAndUpdate(
    { id: req.params.id, available: true },
    { $addToSet: { likers: req.auth.id } },
    (err, comment) => {
      if (err) {
        return res.status(500).end();
      }
      if (!comment) {
        return res.status(404).send("404 Not Found: Comment does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * Remove likers from the comment of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/unlike", authenticate([]), (req, res) => {
  Comment.findOneAndUpdate(
    { id: req.params.id, available: true },
    { $pullAll: { likers: [req.auth.id] } },
    (err, comment) => {
      if (err) {
        return res.status(500).end();
      }
      if (!comment) {
        return res.status(404).send("404 Not Found: Comment does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * POST new comment
 * @returns Location header
 */
router.post("/", authenticate(["root", "writer", "reader"]), (req, res) => {
  const newComment = new Comment({
    createdAt: new Date(),
    createdBy: req.auth.id,
    updatedAt: new Date(),
    updatedBy: req.auth.id,
    ...req.body
  });

  newComment.save((err, comment) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/comments/" + comment.id);
    res.status(201).end();
  });
});

/**
 * PUT existing comment
 * @param {number} id - updating comment's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), (req, res) => {
  Comment.findOne({ id: req.params.id, available: true }, (err, comment) => {
    if (err) {
      return res.status(500).end();
    }
    if (!comment) {
      return res.status(404).send("404 Not Found: Comment does not exist");
    }

    if (req.auth.selfCheckRequired) {
      if (comment.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    const update = {
      updatedAt: new Date(),
      updatedBy: req.auth.id,
      ...req.body
    };
    Comment.findOneAndUpdate(
      { id: req.params.id, available: true },
      { $set: { update } },
      (error, newComment) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newComment) {
          return res.status(404).send("404 Not Found: Comment does not exist");
        }

        res.setHeader("Location", "/v1/comments/" + newComment.id);
        res.status(204).end();
      }
    );
  });
});

/**
 * DELETE a comment of Id
 * @param {number} id - deleting comment's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "self"]), (req, res) => {
  Comment.findOne({ id: req.params.id, available: true }, (err, comment) => {
    if (err) {
      return res.status(500).end();
    }
    if (!comment) {
      return res.status(404).send("404 Not Found: Comment does not exist");
    }

    if (req.auth.selfCheckRequired) {
      if (comment.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    Comment.findOneAndUpdate(
      { id: req.params.id, available: true },
      {
        $set: {
          updatedAt: new Date(),
          updatedBy: req.auth.id,
          available: false
        }
      },
      (error, oldComment) => {
        if (error) {
          return res.status(500).end();
        }
        if (!oldComment) {
          return res.status(404).send("404 Not Found: Comment does not exist");
        }

        res.status(204).end();
      }
    );
  });
});

export default router;
