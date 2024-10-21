import mongoose from "mongoose";
import Verification from "../models/emailVerification.js";
import Users from "../models/userModel.js";
import { compareString, createJWT, hashString } from "../utils/index.js";
import PasswordReset from "../models/PasswordReset.js";
import { resetPasswordLink } from "../utils/sendEmail.js";
import FriendRequest from "../models/friendRequest.js";
import cloudinary from '../utils/cloudinaryConfig.js';
import streamifier from 'streamifier';
import Notification from "../models/notificationModel.js";

export const verifyEmail = async (req, res) => {
  const { userId, token } = req.params;

  try {
    const result = await Verification.findOne({ userId });

    if (result) {
      const { expiresAt, token: hashedToken } = result;

      // token has expires
      if (expiresAt < Date.now()) {
        Verification.findOneAndDelete({ userId })
          .then(() => {
            Users.findOneAndDelete({ _id: userId })
              .then(() => {
                const message = "Verification token has expired.";
                res.redirect(`/users/verified?status=error&message=${message}`);
              })
              .catch((err) => {
                res.redirect(`/users/verified?status=error&message=`);
              });
          })
          .catch((error) => {
            console.log(error);
            res.redirect(`/users/verified?message=`);
          });
      } else {
        //token valid
        compareString(token, hashedToken)
          .then((isMatch) => {
            if (isMatch) {
              Users.findOneAndUpdate({ _id: userId }, { verified: true })
                .then(() => {
                  Verification.findOneAndDelete({ userId }).then(() => {
                    const message = "Email verified successfully";
                    res.redirect(
                      `/users/verified?status=success&message=${message}`
                    );
                  });
                })
                .catch((err) => {
                  console.log(err);
                  const message = "Verification failed or link is invalid";
                  res.redirect(
                    `/users/verified?status=error&message=${message}`
                  );
                });
            } else {
              // invalid token
              const message = "Verification failed or link is invalid";
              res.redirect(`/users/verified?status=error&message=${message}`);
            }
          })
          .catch((err) => {
            console.log(err);
            res.redirect(`/users/verified?message=`);
          });
      }
    } else {
      const message = "Invalid verification link. Try again later.";
      res.redirect(`/users/verified?status=error&message=${message}`);
    }
  } catch (error) {
    console.log(err);
    res.redirect(`/users/verified?message=`);
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "Email address not found.",
      });
    }

    const existingRequest = await PasswordReset.findOne({ email });
    if (existingRequest) {
      if (existingRequest.expiresAt > Date.now()) {
        return res.status(201).json({
          status: "PENDING",
          message: "Reset password link has already been sent tp your email.",
        });
      }
      await PasswordReset.findOneAndDelete({ email });
    }
    await resetPasswordLink(user, res);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { userId, token } = req.params;

  try {
    // find record
    const user = await Users.findById(userId);

    if (!user) {
      const message = "Invalid password reset link. Try again";
      res.redirect(`/users/resetpassword?status=error&message=${message}`);
    }

    const resetPassword = await PasswordReset.findOne({ userId });

    if (!resetPassword) {
      const message = "Invalid password reset link. Try again";
      return res.redirect(
        `/users/resetpassword?status=error&message=${message}`
      );
    }

    const { expiresAt, token: resetToken } = resetPassword;

    if (expiresAt < Date.now()) {
      const message = "Reset Password link has expired. Please try again";
      res.redirect(`/users/resetpassword?status=error&message=${message}`);
    } else {
      const isMatch = await compareString(token, resetToken);

      if (!isMatch) {
        const message = "Invalid reset password link. Please try again";
        res.redirect(`/users/resetpassword?status=error&message=${message}`);
      } else {
        res.redirect(`/users/resetpassword?type=reset&id=${userId}`);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { userId, password } = req.body;

    const hashedpassword = await hashString(password);

    const user = await Users.findByIdAndUpdate(
      { _id: userId },
      { password: hashedpassword }
    );

    if (user) {
      await PasswordReset.findOneAndDelete({ userId });

      res.status(200).json({
        ok: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const getUser = async (req, res, next) => {
  try {
    let userId;

    if (req.params.id) {
      // Si un ID est fourni dans les paramètres, on l'utilise pour récupérer l'utilisateur spécifié
      userId = req.params.id;
    } else if (req.user && req.user._id) {
      // Sinon, on utilise l'ID de l'utilisateur authentifié
      userId = req.user._id;
    } else {
      // Si aucun ID n'est disponible, on renvoie une erreur
      return res.status(400).json({
        success: false,
        message: "Aucun ID d'utilisateur fourni",
      });
    }

    // Récupérer l'utilisateur par son ID
    const user = await Users.findById(userId).populate({
      path: "friends",
      select: "-password", // Exclure le mot de passe des amis
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Supprimer le mot de passe avant de retourner la réponse
    user.password = undefined;

    // Répondre avec les données de l'utilisateur
    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'utilisateur",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, location, profession } = req.body;

    // Vérification des champs requis
    if (!(firstName && lastName && location && profession)) {
      return res.status(400).json({ message: "Veuillez fournir tous les champs requis." });
    }

    const userId = req.user._id; // Récupérer l'ID de l'utilisateur depuis req.user

    const updateUser = {
      firstName,
      lastName,
      location,
      profession,
    };

    if (req.file) {
      // Fonction pour télécharger le fichier vers Cloudinary en utilisant un flux
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'profiles',
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

      try {
        const result = await streamUpload(req.file.buffer);
        updateUser.profileUrl = result.secure_url;
      } catch (error) {
        console.error('Erreur lors du téléchargement sur Cloudinary :', error);
        return res.status(500).json({ message: "Erreur lors du téléchargement de l'image." });
      }
    }

    const user = await Users.findByIdAndUpdate(userId, updateUser, {
      new: true,
    }).populate({ path: "friends", select: "-password" });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const token = createJWT(user._id);

    user.password = undefined; // Supprimer le mot de passe avant d'envoyer la réponse

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès.",
      user,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil." });
  }
};

export const friendRequest = async (req, res) => {
  try {
    const userId = req.user._id; // ID de l'utilisateur authentifié
    const { requestTo } = req.body;

    if (!requestTo) {
      return res.status(400).json({
        success: false,
        message: "L'ID de l'utilisateur à ajouter est requis.",
      });
    }

    // Vérifier si l'utilisateur essaie d'envoyer une demande à lui-même
    if (userId.toString() === requestTo) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas envoyer une demande d'ami à vous-même.",
      });
    }

    // Vérifier si l'utilisateur cible existe
    const targetUser = await Users.findById(requestTo);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur cible non trouvé.",
      });
    }

    // Vérifier si les utilisateurs sont déjà amis
    if (
      targetUser.friends.includes(userId) ||
      req.user.friends.includes(requestTo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Vous êtes déjà amis avec cet utilisateur.",
      });
    }

    // Vérifier si une demande d'ami a déjà été envoyée ou reçue
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { requestFrom: userId, requestTo },
        { requestFrom: requestTo, requestTo: userId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          existingRequest.requestFrom.toString() === userId.toString()
            ? "Demande d'ami déjà envoyée."
            : "Cet utilisateur a déjà envoyé une demande d'ami.",
      });
    }

    // Créer une nouvelle demande d'ami
    const newFriendRequest = await FriendRequest.create({
      requestFrom: userId,
      requestTo,
    });

    // Créer une notification pour la demande d'ami
    await Notification.create({
      recipient: requestTo,
      sender: userId,
      type: "friend_request",
    });

    res.status(201).json({
      success: true,
      message: "Demande d'ami envoyée avec succès.",
      data: newFriendRequest,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de la demande d'ami :", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur lors de l'envoi de la demande d'ami.",
      error: error.message,
    });
  }
};

export const getFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id; // Utilisation de req.user._id

    const request = await FriendRequest.find({
      requestTo: userId,
      requestStatus: "Pending",
    })
      .populate({
        path: "requestFrom",
        select: "firstName lastName profileUrl profession -password",
      })
      .limit(10)
      .sort({
        _id: -1,
      });

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user._id; // Utilisation de req.user._id

    const { rid, status } = req.body;

    const requestExist = await FriendRequest.findById(rid);

    if (!requestExist) {
      next("No Friend Request Found.");
      return;
    }

    const updatedRequest = await FriendRequest.findByIdAndUpdate(
      { _id: rid },
      { requestStatus: status }
    );

    if (status === "Accepted") {
      const user = await Users.findById(userId);

      user.friends.push(updatedRequest?.requestFrom);

      await user.save();

      const friend = await Users.findById(updatedRequest?.requestFrom);

      friend.friends.push(updatedRequest?.requestTo);

      await friend.save();

      // Créer une notification pour l'acceptation de la demande d'ami
      await Notification.create({
        recipient: updatedRequest.requestFrom,
        sender: userId,
        type: "friend_accept",
      });
    }

    res.status(201).json({
      success: true,
      message: "Friend Request " + status,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const suggestedFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    // Trouver toutes les demandes d'ami envoyées par l'utilisateur actuel
    const sentRequests = await FriendRequest.find({ requestFrom: userId });
    const sentRequestIds = sentRequests.map(request => request.requestTo.toString());

    let queryObject = {
      _id: { $ne: userId },
      friends: { $ne: userId },
      _id: { $nin: sentRequestIds }
    };

    let queryResult = await Users.find(queryObject)
      .limit(15)
      .select("firstName lastName profileUrl profession -password");

    // Filtrage supplémentaire pour s'assurer que l'utilisateur connecté n'est pas inclus
    const suggestedFriends = queryResult.filter(user => user._id.toString() !== userId.toString());

    res.status(200).json({
      success: true,
      data: suggestedFriends,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error.message });
  }
};

export const profileViews = async (req, res, next) => {
  try {
    const { userId } = req.body.user;
    const { id } = req.body;

    const user = await Users.findById(id);

    user.views.push(userId);

    await user.save();

    res.status(201).json({
      success: true,
      message: "Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "auth error",
      success: false,
      error: error.message,
    });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId).populate({
      path: 'friends',
      select: 'firstName lastName profileUrl profession'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    res.status(200).json({
      success: true,
      data: user.friends
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des amis:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des amis",
      error: error.message
    });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { term } = req.query;
    const users = await Users.find({
      $or: [
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
      ],
      _id: { $ne: req.user._id }
    }).select('firstName lastName profileUrl');

    res.status(200).json(users);
  } catch (error) {
    console.error("Erreur lors de la recherche d'utilisateurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche d'utilisateurs",
      error: error.message
    });
  }
};