// models/commentModel.js
import mongoose, { Schema } from "mongoose";

// Schéma de commentaire
const commentSchema = new mongoose.Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        postId: { type: Schema.Types.ObjectId, ref: "Posts", required: true },
        comment: { type: String, required: true },
        replies: [
            {
                userId: { type: Schema.Types.ObjectId, ref: "Users" },
                comment: { type: String },
                replyAt: { type: Date },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
                likes: [{ type: Schema.Types.ObjectId, ref: "Users" }],
            },
        ],
        likes: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    },
    { timestamps: true }
);

const Comments = mongoose.model("Comments", commentSchema);

export default Comments;
