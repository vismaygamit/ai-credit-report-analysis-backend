import express from "express";
import { analyze, getCreditReport, getUserLanguage, sendReceipt, sendReport, transLate, updateUserLanguage } from "../controllers/analyzeController.js";
import upload from "../middleware/file.js";
import { requireAuth } from '@clerk/express';

const router = express.Router();

router.post("/analyze", requireAuth(), upload.single('file'), analyze);
router.get("/report/:userId", getCreditReport);
router.post("/translate", requireAuth(), transLate);
router.get("/getuserlanguage/:userId", getUserLanguage);
router.patch("/updateuserlanguage/:lang", requireAuth() ,updateUserLanguage);
router.post("/sendreport", requireAuth(), upload.single('file'), sendReport);
router.post("/sendreceipt", requireAuth(), upload.single('file'), sendReceipt);

export default router;
