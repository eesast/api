import express from "express";
import Article from "../models/article";
import authenticate from "../middlewares/authenticate";
const router = express.Router();

/**
 * GET
 * @query {String} title -> partial match
 * @query {String} author
 * @query {String} tag
 * @query {Number} likedBy
 * @returns {[Object]} certain articles
 */
router.get("/", (req, res) => {
  let query = {};
  if (req.query.title) query.title = { $regex: req.query.title, $options: "i" };
  if (req.query.author) query.author = req.query.author;
  if (req.query.tag) query.tags = req.query.tag;
  if (req.query.likedBy) query.likers = req.query.likedBy;

  Article.find(query, "-_id -__v", (err, articles) => {
    if (err) return res.status(500).end();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(articles));
  });
});

/**
 * GET
 * @param {Number} id
 * @returns {Object} article with id
 */
router.get("/:id", (req, res) => {
  Article.findOne({ id: req.params.id }, "-_id -__v", (err, article) => {
    if (err) return res.status(500).end();
    if (!article)
      return res.status(404).send("404 Not Found: Article does not exist");

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(article));
  });
});

/**
 * POST
 * @returns {String} Location header
 */
router.post("/", authenticate(["root", "writer"]), (req, res) => {
  const newArticle = new Article(req.body);

  newArticle.save((err, article) => {
    if (err) return res.status(500).end();

    res.setHeader("Location", "/v1/articles/" + article.id);
    res.status(201).end();
  });
});

/**
 * PUT
 * @param {Number} id updating article's id
 * @returns {String} Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self"]), (req, res) => {
  Article.findOne({ id: req.params.id }, (err, article) => {
    if (err) return res.status(500).end();
    if (!article)
      return res.status(404).send("404 Not Found: Article does not exist");

    if (req.selfCheckRequired) {
      if (article.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    const update = { updatedAt: new Date(), ...req.body };
    article.updateOne(update, (err, newArticle) => {
      if (err) return res.status(500).end();
      if (!newArticle)
        return res.status(404).send("404 Not Found: Article does not exist");

      res.setHeader("Location", "/v1/articles/" + newArticle.id);
      res.status(204).end();
    });
  });
});

/**
 * DELETE
 * @param {Number} id deleting article's id
 * @returns {String} No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  Article.findOneAndDelete({ id: req.params.id }, (err, article) => {
    if (err) return res.status(500).end();
    if (!article)
      return res.status(404).send("404 Not Found: Article does not exist");

    res.status(204).end();
  });
});

export default router;
