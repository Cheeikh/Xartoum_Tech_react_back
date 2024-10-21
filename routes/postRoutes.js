// routes/postRoutes.js
import express from "express";
import {
  createPost,
  getPosts,
  getPost,
  getUserPost,
  getComments,
  likePost,
  likePostComment,
  commentPost,
  replyPostComment,
  deletePost,
  searchPosts,
} from "../controllers/postController.js";
import upload from "../middleware/upload.js"; // Middleware pour Multer
import userAuth from "../middleware/authMiddleware.js";

const router = express.Router();

// Protégez la route get-posts avec verifyToken
router.get("/get-posts", userAuth, getPosts);

// Ajoutez la route de recherche avant la route pour obtenir un post spécifique
router.get("/search", userAuth, searchPosts);

// Routes pour les commentaires
router.get("/comments/:postId", userAuth, getComments);
router.post("/comment/:postId", userAuth, commentPost);
router.post("/reply/:commentId", userAuth, replyPostComment);

// Routes pour les likes
router.post("/like/:id", userAuth, likePost);
router.post("/like-comment/:id/:rid?", userAuth, likePostComment);

// Routes pour les posts
router.post("/create-post", userAuth, upload.single("media"), createPost);
router.post("/", userAuth, getPosts);
router.get("/user/:id", userAuth, getUserPost);
router.delete("/:id", userAuth, deletePost);

// Cette route doit être placée après la route de recherche
router.get("/:id", userAuth, getPost);

export default router;
