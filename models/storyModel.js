import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    text: String,
    createdAt: { type: Date, default: Date.now },
  });
  
  const storySchema = new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
      content: [
        {
          type: {
            type: String,
            enum: ["image", "video"],
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          description: String,
          duration: {
            type: Number,
            default: 5000,
          },
          likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
          comments: [commentSchema],
        },
      ],
      expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000),
      },
    },
    { timestamps: true }
  );
  
  const Story = mongoose.model("Story", storySchema);
  
  export default Story;
  