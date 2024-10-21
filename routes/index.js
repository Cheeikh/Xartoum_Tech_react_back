import express from "express";
import authRoute from "./authRoutes.js";
import userRoute from "./userRoutes.js";
import postRoute from "./postRoutes.js";
import notificationRoute from "./notificationRoutes.js";
import messageRoute from "./messageRoutes.js";
import storyRoute from "./storyRoutes.js";
import creditRoute from "./creditRoutes.js"; // Ajout de la route pour l'achat de crédits

const router = express.Router();

router.use(`/auth`, authRoute); //auth/register
router.use(`/users`, userRoute);
router.use(`/posts`, postRoute);
router.use(`/notifications`, notificationRoute);
router.use(`/messages`, messageRoute);
router.use(`/stories`, storyRoute);
router.use('/credits', creditRoute); // Ajout de la route pour l'achat de crédits

export default router;
