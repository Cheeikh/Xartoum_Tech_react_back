import Notification from "../models/notificationModel.js";
// import { io } from "../index.js";

export const createNotification = async (
  recipientId,
  senderId,
  type,
  postId = null
) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type: type,
      post: postId,
    });

    // io.emit("new_notification", notification);

    return notification;
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw new Error("Erreur lors de la création de la notification");
  }
};

export const getNotifications = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  // Validation des paramètres de pagination
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  if (
    isNaN(pageNumber) ||
    pageNumber < 1 ||
    isNaN(limitNumber) ||
    limitNumber < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Les paramètres de pagination sont invalides.",
    });
  }

  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "firstName lastName profileUrl")
      .populate("post", "description")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications",
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    res.status(200).json({
      success: true,
      message: "Toutes les notifications ont été marquées comme lues",
    });
  } catch (error) {
    console.error("Erreur lors du marquage des notifications:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage des notifications",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;

  // Vérifier si l'ID est valide
  if (!mongoose.isValidObjectId(notificationId)) {
    return res.status(400).json({
      success: false,
      message: "ID de notification invalide",
    });
  }

  try {
    const userId = req.user._id;
    console.log(
      "Tentative de mise à jour de la notification avec ID :",
      notificationId
    );

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marquée comme lue",
      data: notification,
    });
  } catch (error) {
    console.error("Erreur lors du marquage de la notification:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du marquage de la notification",
    });
  }
};

export const archiveOldNotifications = async () => {
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() - 1);

  try {
    await Notification.deleteMany({ createdAt: { $lt: thresholdDate } });
    console.log("Notifications archivées avec succès.");
  } catch (error) {
    console.error("Erreur lors de l'archivage des notifications :", error);
  }
};
