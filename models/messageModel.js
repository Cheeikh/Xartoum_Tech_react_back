import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'audio', 'file', 'image', 'video'], default: 'text' },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;