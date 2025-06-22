import express from "express";
import { config } from "dotenv";
import multer from "multer";
import { connectDatabase } from "./src/config/database.js";
const upload = multer({ dest: "uploads/" }); // Set up multer for file uploads
config();

const app = express();
connectDatabase();

// app.use(
//   express.json({
//     // store the raw request body to use it for signature verification
//     verify: (req, buf, encoding) => {
//       req.rawBody = buf?.toString(encoding || "utf8");
//     },
//   })
// );

// Enable CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

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
