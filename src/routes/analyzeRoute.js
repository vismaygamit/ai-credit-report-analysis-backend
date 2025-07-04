import express from "express";
import { analyze, getCreditReport } from "../controllers/analyzeController.js";
import upload from "../middleware/file.js";

const router = express.Router();
router.post("/analyze", upload.single('file'), analyze);
router.get("/report/:userId", getCreditReport);

export default router;
