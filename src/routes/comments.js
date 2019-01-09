import express from "express";
import Comment from "../models/comment";
import authenticate from "../middlewares/authenticate";
const router = express.Router();

/**
 * GET
 * @query {Number} replyTo
 * @query {Number} likedBy
 * @query {Number} articleId
 * @query {Number} authorId
 * @returns certain articles
 */
router.get("/", (req, res) => {
  let query = {};
  if (req.query.replyTo) query.replyTo = req.query.replyTo;
  if (req.query.articleId) query.articleId = req.query.articleId;
  if (req.query.authorId) query.authorId = req.query.authorId;
  if (req.query.likedBy) query.likers = req.query.likedBy;

  Comment.find(query, "-_id -__v", (err, comments) => {
    if (err) return res.status(500).end();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(comments));
  });
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} comment with id
 */
router.get("/:id", (req, res) => {
  Comment.findOne({ id: req.params.id }, "-_id -__v", (err, comment) => {
    if (err) return res.status(500).end();
    if (!comment)
      return res.status(404).send("404 Not Found: Comment does not exist");

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(comment));
  });
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} comment with id
 */
router.get("/:id/like", authenticate(), (req, res) => {
  Comment.findOneAndUpdate(
    { id: req.params.id },
    { $addToSet: { likers: req.auth.id } },
    (err, comment) => {
      if (err) return res.status(500).end();
      if (!comment)
        return res.status(404).send("404 Not Found: Comment does not exist");
      console.log(comment);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} comment with id
 */
router.get("/:id/unlike", authenticate(), (req, res) => {
  Comment.findOneAndUpdate(
    { id: req.params.id },
    { $pullAll: { likers: [req.auth.id] } },
    (err, comment) => {
      console.log(err);
      if (err) return res.status(500).end();
      if (!comment)
        return res.status(404).send("404 Not Found: Comment does not exist");

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * POST
 * @returns {String} Location header
 */
router.post("/", authenticate(["root", "writer", "reader"]), (req, res) => {
  const newComment = new Comment(req.body);

  newComment.save((err, comment) => {
    if (err) return res.status(500).end();

    res.setHeader("Location", "/v1/comments/" + comment.id);
    res.status(201).end();
  });
});

/**
 * PUT
 * @param {Number} id updating comment's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), (req, res) => {
  Comment.findOne({ id: req.params.id }, (err, comment) => {
    if (err) return res.status(500).end();
    if (!comment)
      return res.status(404).send("404 Not Found: Comment does not exist");

    if (req.selfCheckRequired) {
      if (comment.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    const update = { updatedAt: new Date(), ...req.body };
    comment.updateOne(update, (err, newComment) => {
      if (err) return res.status(500).end();
      if (!newComment)
        return res.status(404).send("404 Not Found: Comment does not exist");

      res.setHeader("Location", "/v1/comments/" + newComment.id);
      res.status(204).end();
    });
  });
});

/**
 * DELETE
 * @param {Number} id deleting comment's id
 * @returns {String} No Content or Not Found
 */
router.delete("/:id", authenticate(["root", "self"]), (req, res) => {
  Comment.findOne({ id: req.params.id }, (err, comment) => {
    if (err) return res.status(500).end();
    if (!comment)
      return res.status(404).send("404 Not Found: Comment does not exist");

    if (req.selfCheckRequired) {
      if (comment.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    // it seems Document does not have prototype `delete`
    Comment.findOneAndDelete({ id: req.params.id }, (err, comment) => {
      if (err) return res.status(500).end();
      if (!comment)
        return res.status(404).send("404 Not Found: Comment does not exist");

      res.status(204).end();
    });
  });
});

export default router;
