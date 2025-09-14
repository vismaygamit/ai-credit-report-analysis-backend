import { Server } from "socket.io";
import express from "express";
import http from "http";
import { verifyToken } from "@clerk/express";
import { config } from "dotenv";
import handleUserMessage from "../util/aiAssistant.js";
config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONT_END_URL || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

const userSocketMap = {}; // this map stores socket id corresponding the user id; userId -> socketId
io.use(async (socket, next) => {
  const uid =
    socket.handshake.auth.uid;
    if (!uid) {
    console.error("RoomId is required");
    return next(new Error("RoomId is required"));
  }

  try {
    socket.userId = uid;
    socket.join(uid);
    userSocketMap[uid] = socket.id;
    next();
  } catch (err) {
    console.error("err", err);
    next(new Error("Authentication error: invalid token"));
  }
});

io.on("connection", async (socket) => {
  socket.on("message", async (data, preferLanguage, sessionId) => {
    await handleUserMessage(socket.userId, data, preferLanguage, sessionId);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId];
    }
    // io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
