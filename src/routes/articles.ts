import express from "express";
import authenticate from "../middlewares/authenticate";
import Article from "../models/article";
import pick from "lodash.pick";

const router = express.Router();

/**
 * GET articles with queries
 * @param {string} title - Title will be partial matched
 * @param {number} authorId
 * @param {number} createdBy
 * @param {string} alias
 * @param {string} tag
 * @param {number} likedBy - liker's Id
 * @param {number} begin
 * @param {number} end
 * @param {boolean} noContent
 * @param {boolean} invisible
 * @returns {Object[]} certain articles
 */
router.get("/", async (req, res, next) => {
  const query = {
    ...pick(req.query, [
      "author", // TODO: 实现这个字段的正常查询
      "authorId",
      "createdBy",
      "alias",
      "tag",
      "likedBy"
    ]),
    ...(req.query.title && {
      title: { $regex: req.query.title, $options: "i" }
    }),
    visible: !req.query.invisible
  };

  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
  const select =
    "-_id -__v" + (req.query.noContent === true ? " -content" : "");

  try {
    const articles = await Article.find(query, select, {
      skip: begin,
      limit: end - begin + 1,
      sort: "-createdAt"
    });

    if (query.alias) {
      await Article.findOneAndUpdate(
        { id: articles[0].id },
        { $inc: { views: 1 } }
      );
    }

    res.json(articles);
  } catch (err) {
    next(err);
  }
});

/**
 * GET article of Id
 * @param {number} id - article Id
 * @returns {Object} article with id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const article = await Article.findOne({ id: req.params.id }, "-_id -__v");

    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    res.json(article);
  } catch (err) {
    next(err);
  }
});

/**
 * Set likers of the article of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/like", authenticate([]), async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { id: req.params.id },
      { $addToSet: { likers: req.auth.id } }
    );

    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * Remove likers from the article of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/unlike", authenticate([]), async (req, res, next) => {
  try {
    const article = await Article.findOneAndUpdate(
      { id: req.params.id },
      { $pullAll: { likers: [req.auth.id] } }
    );

    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST new article
 * @returns Location header
 */
router.post("/", authenticate(["root", "writer"]), async (req, res, next) => {
  try {
    const article = await new Article({
      ...req.body,
      createdBy: req.auth.id,
      updatedBy: req.auth.id
    }).save();

    res.setHeader("Location", "/v1/articles/" + article.id);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT existing article
 * @param {number} id - updating article's id
 * @returns Location header or Not Found
 */
router.put(
  "/:id",
  authenticate(["root", "self", "editor"]),
  async (req, res, next) => {
    try {
      const article = await Article.findOne({ id: req.params.id });

      if (!article) {
        return res.status(404).send("404 Not Found: Article does not exist");
      }

      if (req.auth.selfCheckRequired) {
        if (article.authorId !== req.auth.id) {
          return res.status(401).send("401 Unauthorized: Permission denied");
        }
      }

      const update = {
        ...req.body,
        updatedAt: new Date(),
        updatedBy: req.auth.id
      };

      const newArticle = await Article.findOneAndUpdate(
        { id: req.params.id },
        update
      );

      res.setHeader("Location", "/v1/articles/" + newArticle!.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE an article of Id
 * @param {Number} id - deleting article's id
 * @returns No Content or Not Found
 */
router.delete(
  "/:id",
  authenticate(["root", "editor"]),
  async (req, res, next) => {
    try {
      const deleteArticle = await Article.findOneAndDelete({
        id: req.params.id
      });

      if (!deleteArticle) {
        return res.status(404).send("404 Not Found: Article does not exist");
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
