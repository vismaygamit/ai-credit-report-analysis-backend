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
// middleware to verify JWT
io.use(async (socket, next) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.query?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");
  if (!token) {
    console.error("Authorization token required");
    return next(new Error("Authentication error: token missing"));
  }

  try {
    const { sub: userId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    socket.userId = userId;
    socket.join(userId);

    userSocketMap[userId] = socket.id;
    next();
  } catch (err) {
    console.error(err);
    next(new Error("Authentication error: invalid token"));
  }
});

io.on("connection", (socket) => {
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  socket.on("message", async (data) => {
    await handleUserMessage(socket.userId, data);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete userSocketMap[socket.userId];
    }
    // io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
