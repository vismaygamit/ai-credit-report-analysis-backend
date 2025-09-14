import express from "express";
import { config } from "dotenv";
import cors from "cors";
import { File } from 'node:buffer';
import { connectDatabase } from "./src/config/database.js";
import { app, server } from "./src/config/socket.js";
import { embedFaqs } from "./src/util/embeddingFileCreation.js";
config();
// import socketHandler from "./src/config/socket.js";

globalThis.File = File;
connectDatabase();
embedFaqs()

// Allow requests from your frontend
app.use(cors({
  origin: process.env.FRONT_END_URL, // or your frontend URL
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

import paymentRoute from "./src/routes/paymentRoute.js";
app.use("/api", paymentRoute);

app.use(express.json());
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false }));

import analyzeRoute from "./src/routes/analyzeRoute.js";
app.use("/api", analyzeRoute);

app.get("/", (req, res) => {
  res.send("Hello world");
});

server.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
