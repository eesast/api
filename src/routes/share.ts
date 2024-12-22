import express from "express";
import authenticate from "../middlewares/authenticate";
import * as ContHasFunc from "../hasura/share";

const router = express.Router();

// 添加课程评论
router.post("/add_course_comment", authenticate(["student"]), async (req, res) => {
    try {
        const { comment, user_uuid, course_uuid, parent_uuid } = req.body;
        if (!comment || !user_uuid || !course_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const comment_uuid = await ContHasFunc.add_course_comment_one(comment, user_uuid, course_uuid, parent_uuid);
        if(!comment_uuid){
            // HasFunc return undefined/null
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ comment_uuid: comment_uuid, message: "Comment added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 添加课程评论星标
router.post("/add_course_comment_stars", authenticate(["student"]), async (req, res) => {
    try {
        const { comment_uuid, user_uuid } = req.body;
        if (!comment_uuid || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.add_course_comment_stars(comment_uuid, user_uuid);
        if(!result){
            return res.status(404).json({message:"Comment not found"});
        }
        res.status(200).json({ comment_uuid: result, message: "Comment star added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 添加课程评论点赞
router.post("/add_course_comment_likes", authenticate(["student"]), async (req, res) => {
    try {
        const { comment_uuid, user_uuid } = req.body;
        if (!comment_uuid || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.add_course_comment_likes(comment_uuid, user_uuid);
        if(!result){
            return res.status(404).json({message: "Comment not found" });
        }
        res.status(200).json({ comment_uuid: result, message: "Comment like added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 更新课程评论
router.put("/update_course_comment", authenticate(["student"]), async (req, res) => {
    try {
        const { comment, uuid } = req.body;
        if (!comment || !uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.update_course_comment(comment, uuid);
        if(!result){
            return res.status(404).json({message:"Comment not found"});
        }
        res.status(200).json({ uuid: result, message: "Comment updated successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 删除课程评论
router.delete("/delete_course_comment", authenticate(["student"]), async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course_comment_one(uuid);
        if(!result){
            res.status(404).json({message: "Comment not found" });
        }
        res.status(200).json({ uuid: result, message: "Comment deleted successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 删除课程评论星标
router.delete("/delete_course_comment_stars", authenticate(["student"]), async (req, res) => {
    try {
        const { comment_uuid, user_uuid } = req.body;
        if (!comment_uuid || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course_comment_stars(comment_uuid, user_uuid);
        if(!result){
            res.status(404).json({message: "Comment not found" });
        }
        res.status(200).json({ comment_uuid: result, message: "Comment star deleted successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 删除课程评论点赞
router.delete("/delete_course_comment_likes", authenticate(["student"]), async (req, res) => {
    try {
        const { comment_uuid, user_uuid } = req.body;
        if (!comment_uuid || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course_comment_likes(comment_uuid, user_uuid);
        if(!result){
            res.status(404).json({message: "Comment not found" });
        }
        res.status(200).json({ comment_uuid: result, message: "Comment like deleted successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// 更新课程信息

// 更新课程

// 更新课程评分


// 添加课程信息

// 添加课程评分

// 添加课程


// 删除课程信息

// 删除课程

// 删除课程评分

export default router;
