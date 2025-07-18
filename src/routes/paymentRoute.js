import express from 'express';
import { checkout, getPaymentDetails, webhook } from '../controllers/paymentController.js';
import { requireAuth } from '@clerk/express';

const router = express.Router();
router.post('/checkout', requireAuth(), express.json(), checkout);
router.get('/paymentdetails', express.json(), getPaymentDetails);
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);
export default router;