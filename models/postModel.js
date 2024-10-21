// models/postModel.js
import mongoose, { Schema } from "mongoose";

// Schéma de post
const postSchema = new mongoose.Schema(
    {
            userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
            description: { type: String, required: true },
            media: { type: String },
            mediaType: { type: String, enum: ['image', 'video', null] },
            likes: [{ type: Schema.Types.ObjectId, ref: "Users" }],
            comments: [{ type: Schema.Types.ObjectId, ref: "Comments" }],
    },
    { timestamps: true }
);

const Posts = mongoose.model("Posts", postSchema);

export default Posts;
