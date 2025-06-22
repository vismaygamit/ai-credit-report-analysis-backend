import express from 'express';
import { checkout, getPaymentDetails, webhook } from '../controllers/paymentController.js';

const router = express.Router();
router.post('/checkout', express.json(), checkout);
router.get('/paymentdetails', express.json(), getPaymentDetails);
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);
export default router;