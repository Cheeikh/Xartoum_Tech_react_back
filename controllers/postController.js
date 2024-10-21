// controllers/postController.js
import Comments from "../models/commentModel.js";
import Posts from "../models/postModel.js";
import cloudinary from "../utils/cloudinaryConfig.js";
import streamifier from "streamifier";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";

export const createPost = async (req, res, next) => {
  try {
    const { description } = req.body;
    const userId = req.user._id;
    let mediaUrl = null;
    let mediaType = null;

    if (!description) {
      return res
        .status(400)
        .json({ message: "Vous devez fournir une description" });
    }

    // Vérifier et réinitialiser les crédits de l'utilisateur si nécessaire
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    user.checkAndResetDailyCredits();

     // Vérifier si l'utilisateur a suffisamment de crédits
     if (user.dailyPostCredits < 5) {
      return res.status(403).json({ message: "Crédits insuffisants pour créer un post" });
    }

     // Décrémenter les crédits de l'utilisateur
     user.dailyPostCredits -= 5;
     await user.save();

    // Si un fichier est téléchargé, téléchargez-le sur Cloudinary
    if (req.file) {
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "posts",
              resource_type: "auto",
            },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      mediaUrl = result.secure_url;
      mediaType = result.resource_type;
    }

    const post = await Posts.create({
      userId,
      description,
      media: mediaUrl,
      mediaType: mediaType,
    });

    // Créer une notification pour le post créé
    await createNotification(userId, userId, "new_post", post._id);

    // Populer le post avec les données de l'utilisateur
    const populatedPost = await Posts.findById(post._id).populate({
      path: "userId",
      select: "firstName lastName location profileUrl -password",
    });

    res.status(201).json({
      success: true,
      message: "Post créé avec succès",
      data: populatedPost,
      remainingCredits: user.dailyPostCredits,
    });
  }  catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const { search, limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Construire la requête de recherche
    let query = {};
    if (search) {
      query = {
        $or: [{ description: { $regex: search, $options: "i" } }],
      };
    }

    // Récupérer les posts correspondant à la requête avec pagination
    const posts = await Posts.find(query)
      .populate({
        path: "userId",
        select: "firstName lastName location profileUrl -password",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le nombre total de posts pour la pagination
    const totalPosts = await Posts.countDocuments(query);

    // Répondre avec les posts et les informations de pagination
    res.status(200).json({
      success: true,
      message: "Posts récupérés avec succès",
      data: posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        postsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des posts:", error);
    res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération des posts" });
  }
};

export const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Posts.findById(id)
      .populate({
        path: "userId",
        select: "firstName lastName location profileUrl -password",
      })
      .populate({
        path: "comments",
        populate: {
          path: "userId",
          select: "firstName lastName location profileUrl -password",
        },
        options: {
          sort: { createdAt: -1 },
        },
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Posts.find({ userId: id })
      .populate({
        path: "userId",
        select: "firstName lastName location profileUrl -password",
      })
      .sort({ _id: -1 });

    res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      data: post,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const postComments = await Comments.find({ postId })
      .populate({
        path: "userId",
        select: "firstName lastName location profileUrl -password",
      })
      .populate({
        path: "replies.userId",
        select: "firstName lastName location profileUrl -password",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: postComments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const likePost = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const post = await Posts.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
      // Créer une notification pour le like
      await createNotification(post.userId, userId, "like", id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: hasLiked
        ? "Post unliked successfully"
        : "Post liked successfully",
      data: post,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const likePostComment = async (req, res, next) => {
  const { id, rid } = req.params; // id: ID du commentaire, rid: ID de la réponse (facultatif)
  const userId = req.user._id; // Récupération de l'ID de l'utilisateur à partir de la requête

  try {
    if (!rid) {
      // Si rid est absent, on like un commentaire
      const comment = await Comments.findById(id);
      if (!comment) {
        return res.status(404).json({ message: "Commentaire non trouvé" });
      }

      const hasLiked = comment.likes.includes(userId);

      if (hasLiked) {
        // Si l'utilisateur a déjà liké, on retire son like
        comment.likes.pull(userId);
      } else {
        // Sinon, on ajoute le like de l'utilisateur
        comment.likes.push(userId);
      }

      await comment.save();

      res.status(200).json({
        success: true,
        message: hasLiked
          ? "Commentaire déliké avec succès"
          : "Commentaire liké avec succès",
        data: comment,
      });
    } else {
      // Si rid est présent, on like une réponse
      const comment = await Comments.findById(id);
      if (!comment) {
        return res.status(404).json({ message: "Commentaire non trouvé" });
      }

      const reply = comment.replies.id(rid);
      if (!reply) {
        return res.status(404).json({ message: "Réponse non trouvée" });
      }

      const hasLiked = reply.likes.includes(userId);

      if (hasLiked) {
        // Retirer le like de la réponse
        reply.likes.pull(userId);
      } else {
        // Ajouter un like à la réponse
        reply.likes.push(userId);
      }

      await comment.save();

      res.status(200).json({
        success: true,
        message: hasLiked
          ? "Réponse délikée avec succès"
          : "Réponse likée avec succès",
        data: comment,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const commentPost = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const userId = req.user._id;
    const { postId } = req.params; // id: post ID

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ message: "Comment is required." });
    }

    const newComment = await Comments.create({
      comment,
      userId,
      postId: postId,
    });

    await Posts.findByIdAndUpdate(
      postId,
      { $push: { comments: newComment._id } },
      { new: true }
    );

    // Créer une notification pour le commentaire
    const postOwnerId = (await Posts.findById(postId)).userId; // Récupérer l'ID de l'utilisateur qui a créé le post
    await createNotification(postOwnerId, userId, "new_comment", postId);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: newComment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const replyPostComment = async (req, res, next) => {
  const { comment } = req.body;
  const { commentId } = req.params; // id: comment ID
  const userId = req.user._id;

  if (!comment || comment.trim() === "") {
    return res.status(400).json({ message: "Reply is required." });
  }

  try {
    const commentDoc = await Comments.findById(commentId);
    if (!commentDoc) {
      return res.status(404).json({ message: "Comment not found" });
    }

    commentDoc.replies.push({
      comment,
      userId,
      replyAt: new Date(),
    });

    await commentDoc.save();

    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: commentDoc,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Posts.findById(id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Vérifier si l'utilisateur est le propriétaire du post
    if (post.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized to delete this post" });
    }

    await Posts.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchPosts = async (req, res, next) => {
  console.log("Recherche en cours avec la requête:", req.query);
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Une requête de recherche est requise" });
    }

    // Recherche des utilisateurs correspondants
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } },
        { profession: { $regex: query, $options: "i" } }
      ]
    });

    const userIds = users.map(user => user._id);

    // Recherche des posts correspondants
    const posts = await Posts.find({
      $or: [
        { description: { $regex: query, $options: "i" } },
        { userId: { $in: userIds } }
      ]
    }).populate({
      path: "userId",
      select: "firstName lastName location profileUrl -password",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Recherche effectuée avec succès",
      data: posts
    });
  } catch (error) {
    console.error("Erreur lors de la recherche:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche",
      error: error.message
    });
  }
};
