import express from "express";
import { config } from "dotenv";
import cors from "cors";
import { File } from 'node:buffer';
import { connectDatabase } from "./src/config/database.js";
import { clerkMiddleware } from '@clerk/express'
config();

const app = express();
globalThis.File = File;
connectDatabase();
app.use(clerkMiddleware())

// Enable CORS

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

app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
