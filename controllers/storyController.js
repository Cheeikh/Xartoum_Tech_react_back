import Story from "../models/storyModel.js";
import User from "../models/userModel.js";
import cloudinary from "../utils/cloudinaryConfig.js";
import fs from "fs";
import streamifier from 'streamifier';


export const createStory = async (req, res) => {
  try {
    const { description, duration } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier média n'a été téléchargé",
      });
    }

    console.log('Fichier reçu :', req.file);

    // Fonction pour télécharger le fichier vers Cloudinary en utilisant un flux
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'stories',
            resource_type: 'auto',
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

    // Vérifier que le buffer est défini
    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Le fichier n'a pas été correctement téléchargé.",
      });
    }

    const result = await streamUpload(req.file.buffer);

    // Pas besoin de supprimer un fichier du disque car nous utilisons memoryStorage

    const newStory = new Story({
      user: userId,
      content: [{
        type: result.resource_type,
        url: result.secure_url,
        description: description,
        duration: duration || (result.resource_type === 'image' ? 5000 : 0),
      }],
    });

    await newStory.save();

    res.status(201).json({
      success: true,
      message: "Story créée avec succès",
      story: newStory,
    });
  } catch (error) {
    console.error('Erreur lors de la création de la story:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la story",
      error: error.message,
    });
  }
};

export const getStories = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Récupérer les stories de l'utilisateur et de ses amis
    const stories = await Story.find({
      $or: [
        { user: userId },
        { user: { $in: user.friends } },
      ],
      expiresAt: { $gt: new Date() },
    }).populate("user", "firstName lastName profileUrl");

    res.status(200).json({
      success: true,
      stories: stories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des stories",
      error: error.message,
    });
  }
};

export const likeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { contentIndex } = req.body;
    const userId = req.user._id;

    console.log(`Liking story: ${storyId}, contentIndex: ${contentIndex}, userId: ${userId}`);

    const story = await Story.findById(storyId);
    if (!story) {
      console.log(`Story not found: ${storyId}`);
      return res.status(404).json({ success: false, message: "Story non trouvée" });
    }

    console.log(`Story found: ${story._id}, content length: ${story.content.length}`);

    if (contentIndex < 0 || contentIndex >= story.content.length) {
      console.log(`Invalid content index: ${contentIndex}`);
      return res.status(400).json({ success: false, message: "Index de contenu invalide" });
    }

    const content = story.content[contentIndex];
    console.log(`Content: ${JSON.stringify(content)}`);

    // Initialiser likes comme un tableau s'il n'existe pas
    if (!Array.isArray(content.likes)) {
      content.likes = [];
    }

    const likeIndex = content.likes.findIndex(like => like.toString() === userId.toString());
    console.log(`Like index: ${likeIndex}`);

    if (likeIndex === -1) {
      content.likes.push(userId);
      console.log(`Added like for user ${userId}`);
    } else {
      content.likes.splice(likeIndex, 1);
      console.log(`Removed like for user ${userId}`);
    }

    await story.save();
    console.log(`Story saved successfully`);

    res.status(200).json({
      success: true,
      likes: content.likes.length,
    });
  } catch (error) {
    console.error(`Error in likeStory: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: "Erreur lors du like/unlike de la story",
      error: error.message,
    });
  }
};

export const commentStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { contentIndex, comment } = req.body;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story non trouvée" });
    }

    if (contentIndex < 0 || contentIndex >= story.content.length) {
      return res.status(400).json({ success: false, message: "Index de contenu invalide" });
    }

    const content = story.content[contentIndex];
    content.comments.push({
      user: userId,
      text: comment,
    });

    await story.save();

    const populatedStory = await Story.findById(storyId)
      .populate('content.comments.user', 'firstName lastName profileUrl');

    res.status(200).json({
      success: true,
      comments: populatedStory.content[contentIndex].comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'ajout du commentaire",
      error: error.message,
    });
  }
};

export const getLikes = async (req, res) => {
  try {
    const { storyId, contentIndex } = req.params;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story non trouvée" });
    }

    if (contentIndex < 0 || contentIndex >= story.content.length) {
      return res.status(400).json({ success: false, message: "Index de contenu invalide" });
    }

    const likes = story.content[contentIndex].likes.length;

    res.status(200).json({
      success: true,
      likes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des likes",
      error: error.message,
    });
  }
};

export const getComments = async (req, res) => {
  try {
    const { storyId, contentIndex } = req.params;

    const story = await Story.findById(storyId)
      .populate('content.comments.user', 'firstName lastName profileUrl');
    
    if (!story) {
      return res.status(404).json({ success: false, message: "Story non trouvée" });
    }

    if (contentIndex < 0 || contentIndex >= story.content.length) {
      return res.status(400).json({ success: false, message: "Index de contenu invalide" });
    }

    const comments = story.content[contentIndex].comments;

    res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des commentaires",
      error: error.message,
    });
  }
};
