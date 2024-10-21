import express from 'express';
import { getConversations, getMessages, sendMessage, createConversation, sendAudioMessage, sendFileMessage, sendImageMessage,sendVideoMessage } from '../controllers/messageController.js';
import userAuth from "../middleware/authMiddleware.js";
import upload from '../middleware/upload.js';

// Import du contrôleur de messages
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

router.get('/conversations', userAuth, getConversations);
router.get('/messages/:conversationId', userAuth, getMessages);
router.post('/video', userAuth, upload.single('video'), sendVideoMessage);
router.post('/image', userAuth, upload.single('image'), sendImageMessage);
router.post('/messages', userAuth, sendMessage);
router.post('/conversations', userAuth, createConversation);
router.post('/audio', userAuth, upload.single('audio'), sendAudioMessage);
router.post('/file', userAuth, upload.single('file'), sendFileMessage);



export default router;
