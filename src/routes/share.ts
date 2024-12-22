import express from "express";
import authenticate from "../middlewares/authenticate";
import * as ContHasFunc from "../hasura/share";

const router = express.Router();

// 添加课程
router.post("/add_course", authenticate(["admin"]), async (req, res) => {
    try {
        const { year, type, semester, professor, name, language, fullname, code } = req.body;
        if (!year || !type || !semester || !professor || !name || !language || !fullname || !code) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const course_uuid = await ContHasFunc.add_course(year, type, semester, professor, name, language, fullname, code);
        if (!course_uuid) {
            return res.status(404).json({ message: "Failed to add course" });
        }
        res.status(200).json({ course_uuid: course_uuid, message: "Course added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 添加课程信息
router.post("/add_course_info", authenticate(["admin"]), async (req, res) => {
    try {
        const { key, value, course_id } = req.body;
        if (!key || !value || !course_id) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const course_info_id = await ContHasFunc.add_course_info(key, value, course_id);
        if (!course_info_id) {
            return res.status(404).json({ message: "Failed to add course info" });
        }
        res.status(200).json({ course_info_id: course_info_id, message: "Course info added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 添加课程评分
router.post("/add_course_rating", authenticate(["student"]), async (req, res) => {
    try {
        const { dim1, dim2, dim3, dim4, dim5, dim6, course_id, user_uuid } = req.body;
        if (!dim1 || !dim2 || !dim3 || !dim4 || !dim5 || !dim6 || !course_id || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const created_at = await ContHasFunc.add_course_rating(dim1, dim2, dim3, dim4, dim5, dim6, course_id, user_uuid);
        if (!created_at) {
            return res.status(404).json({ message: "Failed to add course rating" });
        }
        res.status(200).json({ created_at: created_at, message: "Course rating added successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


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


// 更新课程
router.post("/update_course", authenticate(["admin", "professor"]), async (req, res) => {
    try {
        const { code, uuid, fullname, language, name, professor, semester, type, year } = req.body;
        if (!code || !uuid || !fullname || !language || !name || !professor || !semester || !type || !year) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.update_course(code, uuid, fullname, language, name, professor, semester, type, year);
        if (!result) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ uuid: result, message: "Course updated successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 更新课程信息
router.post("/update_course_info", authenticate(["admin", "professor"]), async (req, res) => {
    try {
        const { course_id, key, value } = req.body;
        if (!course_id || !key || !value) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.update_course_info(course_id, key, value);
        if (!result) {
            return res.status(404).json({ message: "Course info not found" });
        }
        res.status(200).json({ course_id: result, message: "Course info updated successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 更新课程评分
router.post("/update_course_rating", authenticate(["student"]), async (req, res) => {
    try {
        const { course_id, user_uuid, dim1, dim2, dim3, dim4, dim5, dim6 } = req.body;
        if (!course_id || !user_uuid || dim1 === undefined || dim2 === undefined || dim3 === undefined || dim4 === undefined || dim5 === undefined || dim6 === undefined) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.update_course_rating(course_id, user_uuid, dim1, dim2, dim3, dim4, dim5, dim6);
        if (!result) {
            return res.status(404).json({ message: "Course rating not found" });
        }
        res.status(200).json({ updated_at: result, message: "Course rating updated successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});


// 更新课程评论
router.post("/update_course_comment", authenticate(["student"]), async (req, res) => {
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


// 删除课程
router.post("/delete_course", authenticate(["admin", "professor"]), async (req, res) => {
    try {
        const { uuid } = req.body;
        if (!uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course(uuid);
        if (!result) {
            return res.status(404).json({ message: "Course not found" });
        }
        res.status(200).json({ uuid: result, message: "Course deleted successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 删除课程信息
router.post("/delete_course_info", authenticate(["admin", "professor"]), async (req, res) => {
    try {
        const { course_id, key } = req.body;
        if (!course_id || !key) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course_info(course_id, key);
        if (!result) {
            return res.status(404).json({ message: "Course info not found" });
        }
        res.status(200).json({ course_id: result.course_id, key: result.key, message: "Course info deleted successfully" });
    } catch (err: any) {
        res.status(500).json({
            error: "500 Internal Server Error",
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// 删除课程评分
router.post("/delete_course_rating", authenticate(["student"]), async (req, res) => {
    try {
        const { course_id, user_uuid } = req.body;
        if (!course_id || !user_uuid) {
            return res.status(400).json({ error: "400 Bad Request: Missing required parameters" });
        }
        const result = await ContHasFunc.delete_course_rating(course_id, user_uuid);
        if (!result) {
            return res.status(404).json({ message: "Course rating not found" });
        }
        res.status(200).json({ course_id: result.course_id, user_uuid: result.user_uuid, message: "Course rating deleted successfully" });
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

export default router;
