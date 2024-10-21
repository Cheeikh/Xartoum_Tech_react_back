import express from "express";
import { createStory, getStories, likeStory, commentStory, getLikes, getComments } from "../controllers/storyController.js";
import userAuth from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/create", userAuth, upload.single('media'), createStory);
router.get("/", userAuth, getStories);
router.post("/:storyId/like", userAuth, likeStory);
router.post("/:storyId/comment", userAuth, commentStory);
router.get("/:storyId/likes/:contentIndex", userAuth, getLikes);
router.get("/:storyId/comments/:contentIndex", userAuth, getComments);

export default router;
