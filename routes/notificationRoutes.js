import express from "express";
import {
  createNotification,
  archiveOldNotifications,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notificationController.js";
import userAuth from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes pour les notifications
router.post("/", userAuth, createNotification);
router.get("/", userAuth, getNotifications);
router.put("/mark-all-read", userAuth, markAllNotificationsAsRead);
router.put("/:notificationId/mark-read", userAuth, markNotificationAsRead);
router.delete("/archive", userAuth, archiveOldNotifications);

export default router;
