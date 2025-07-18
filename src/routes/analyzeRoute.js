import express from "express";
import { analyze, getCreditReport, sendReceipt, sendReport, transLate } from "../controllers/analyzeController.js";
import upload from "../middleware/file.js";
import { requireAuth } from '@clerk/express';

const router = express.Router();

router.post("/analyze", requireAuth(), upload.single('file'), analyze);
router.get("/report/:userId", getCreditReport);
router.post("/translate", requireAuth(), transLate);
router.post("/sendreport", requireAuth(), upload.single('file'), sendReport);
router.post("/sendreceipt", requireAuth(), upload.single('file'), sendReceipt);

export default router;
