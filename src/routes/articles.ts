import * as express from "express";
import authenticate from "../middlewares/authenticate";
import Article from "../models/article";

const router = express.Router();

/**
 * GET articles with queries
 * @param {string} title - Title will be partial matched
 * @param {string} author
 * @param {string} alias
 * @param {string} tag
 * @param {number} likedBy - liker's Id
 * @param {number} begin
 * @param {number} end
 * @param {boolean} noContent
 * @param {boolean} invisible
 * @returns {Object[]} certain articles
 */
router.get("/", (req, res) => {
  const query: any = {};
  if (req.query.title) {
    query.title = { $regex: req.query.title, $options: "i" };
  }
  if (req.query.author) {
    query.author = req.query.author;
  }
  if (req.query.alias) {
    query.alias = req.query.alias;
  }
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  if (req.query.likedBy) {
    query.likers = req.query.likedBy;
  }
  if (!req.query.invisible) {
    query.visible = true;
  }
  const begin = parseInt(req.query.begin, 10) || 0;
  const end = parseInt(req.query.end, 10) || Number.MAX_SAFE_INTEGER;
  const select =
    "-_id -__v" + (req.query.noContent === "true" ? " -content" : "");

  Article.find(
    query,
    select,
    { skip: begin, limit: end - begin + 1, sort: "-createdAt" },
    (err, articles) => {
      if (err) {
        return res.status(500).end();
      }

      if (articles.length === 0) {
        return res.status(200).end(JSON.stringify([]));
      }

      if (query.alias) {
        Article.findOneAndUpdate(
          { id: articles[0].id },
          { $inc: { views: 1 } },
          // tslint:disable-next-line: no-empty
          () => {}
        );
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(articles));
    }
  );
});

/**
 * GET article of Id
 * @param {number} id - article Id
 * @returns {Object} article with id
 */
router.get("/:id", (req, res) => {
  Article.findOne({ id: req.params.id }, "-_id -__v", (err, article) => {
    if (err) {
      return res.status(500).end();
    }
    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(JSON.stringify(article));
  });
});

/**
 * Set likers of the article of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/like", authenticate([]), (req, res) => {
  Article.findOneAndUpdate(
    { id: req.params.id },
    { $addToSet: { likers: req.auth.id } },
    (err, article) => {
      if (err) {
        return res.status(500).end();
      }
      if (!article) {
        return res.status(404).send("404 Not Found: Article does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * Remove likers from the article of Id
 * @param {number} id
 * @returns No Content or Not Found
 */
router.get("/:id/unlike", authenticate([]), (req, res) => {
  Article.findOneAndUpdate(
    { id: req.params.id },
    { $pullAll: { likers: [req.auth.id] } },
    (err, article) => {
      if (err) {
        return res.status(500).end();
      }
      if (!article) {
        return res.status(404).send("404 Not Found: Article does not exist");
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(204).end();
    }
  );
});

/**
 * POST new article
 * @returns Location header
 */
router.post("/", authenticate(["root", "writer"]), (req, res) => {
  const newArticle = new Article(req.body);

  newArticle.save((err, article) => {
    if (err) {
      return res.status(500).end();
    }

    res.setHeader("Location", "/v1/articles/" + article.id);
    res.status(201).end();
  });
});

/**
 * PUT existing article
 * @param {number} id - updating article's id
 * @returns Location header or Not Found
 */
router.put("/:id", authenticate(["root", "self", "editor"]), (req, res) => {
  Article.findOne({ id: req.params.id }, (err, article) => {
    if (err) {
      return res.status(500).end();
    }
    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    if (req.auth.selfCheckRequired) {
      if (article.authorId !== req.auth.id) {
        return res.status(401).send("401 Unauthorized: Permission denied");
      }
    }

    const update = { updatedAt: new Date(), ...req.body };
    Article.findOneAndUpdate(
      { id: req.params.id },
      update,
      (error, newArticle) => {
        if (error) {
          return res.status(500).end();
        }
        if (!newArticle) {
          return res.status(404).send("404 Not Found: Article does not exist");
        }

        res.setHeader("Location", "/v1/articles/" + newArticle.id);
        res.status(204).end();
      }
    );
  });
});

/**
 * DELETE an article of Id
 * @param {Number} id - deleting article's id
 * @returns No Content or Not Found
 */
router.delete("/:id", authenticate(["root"]), (req, res) => {
  Article.findOneAndDelete({ id: req.params.id }, (err, article) => {
    if (err) {
      return res.status(500).end();
    }
    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist");
    }

    res.status(204).end();
  });
});

export default router;
