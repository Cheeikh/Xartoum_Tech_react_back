// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import path from "path";
import helmet from "helmet";
import dbConnection from "./dbConfig/index.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import router from "./routes/index.js";
import messageRoutes from './routes/messageRoutes.js';
import http from "http";
import { Server } from "socket.io";

const __dirname = path.resolve(path.dirname(""));

dotenv.config();

const app = express();

// Servir les fichiers statiques de la build React
app.use(express.static(path.join(__dirname, "views/build")));

const PORT = process.env.PORT || 8800;

dbConnection();

app.use(helmet());

const corsOptions = {
  origin: '*', // Accepter toutes les origines
  credentials: true, // Autoriser les credentials (cookies, headers d'authentification, etc.)
  methods: '*', // Autoriser toutes les méthodes HTTP
  allowedHeaders: '*', // Autoriser tous les en-têtes
};

app.use(cors(corsOptions));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));
app.use(router);
app.use('/messages', messageRoutes);

// Error middleware
app.use(errorMiddleware);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Accepter toutes les origines
    credentials: true,
    methods: '*', // Accepter toutes les méthodes
    allowedHeaders: '*', // Accepter tous les en-têtes
  }
});

io.on('connection', (socket) => {
  console.log('Nouvelle connexion socket:', socket.id);

  socket.on('joinRoom', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leaveRoom', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('sendMessage', (message) => {
    io.to(message.conversationId).emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('Déconnexion socket:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
