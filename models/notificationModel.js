import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "like",
        "post",
        "new_post",
        "friend_request",
        "friend_accept",
        "group_invite",
        "event_invite",
        "new_comment",
      ],
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Posts",
    },
    metadata: {
      type: Object, // Permet d'ajouter des informations supplémentaires selon le type de notification
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ajout d'un index composite pour optimiser les requêtes
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
