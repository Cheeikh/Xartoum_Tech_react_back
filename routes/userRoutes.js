// userRoutes.js
import express from "express";
import path from "path";
import {
  acceptRequest,
  changePassword,
  friendRequest,
  getFriendRequest,
  getUser,
  profileViews,
  requestPasswordReset,
  resetPassword,
  suggestedFriends,
  updateUser,
  verifyEmail,
  getFriends,
  searchUsers,
} from "../controllers/userController.js";
import userAuth from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js"; 

const router = express.Router();
const __dirname = path.resolve(path.dirname(""));



// Routes publiques
router.get("/verify/:userId/:token", verifyEmail);

// PASSWORD RESET
router.post("/request-passwordreset", requestPasswordReset);
router.get("/reset-password/:userId/:token", resetPassword);
router.post("/reset-password", changePassword);

// Routes protégées par l'authentification
router.get("/get-user", userAuth, getUser);
router.get("/get-user/:id", userAuth, getUser); // Récupérer un utilisateur par ID

// Mise à jour de l'utilisateur avec gestion du fichier image
router.put("/update-user", userAuth, upload.single("profileUrl"), updateUser);

// Demandes d'amis
router.post("/friend-request", userAuth, friendRequest);
router.post("/get-friend-request", userAuth, getFriendRequest);

// Acceptation / refus des demandes d'amis
router.post("/accept-request", userAuth, acceptRequest);

// Vue du profil
router.post("/profile-view", userAuth, profileViews);

// Amis suggérés
router.post("/suggested-friends", userAuth, suggestedFriends);

// Routes supplémentaires
router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/build", "index.html"));
});

router.get("/resetpassword", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/build", "index.html"));
});

// Ajoutez cette route avec les autres routes protégées
router.get("/friends", userAuth, getFriends);

// Ajoutez cette ligne avec les autres routes
router.get("/search", userAuth, searchUsers);

export default router;
