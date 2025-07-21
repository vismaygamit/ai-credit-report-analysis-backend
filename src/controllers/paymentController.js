import { config } from "dotenv";
import Stripe from "stripe";
import Payment from "../models/payment.js"; // Adjust path as needed
import Report from "../models/report.js"; // Adjust path as needed
config();

export const checkout = async (req, res) => {
  try {
    const { userId } = req.auth;
    // Create a Stripe Checkout session
    const { reportId } = req.body;
    if (!userId || !reportId) {
      return res
        .status(400)
        .json({ message: "User ID and report id is required." });
    }

    // Initialize Stripe with secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
    });


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Personalized Credit Insights",
              description:
                "Unlock AI-generated strategies for your credit report",
            },
            unit_amount: 2500, // $25 in cents
            //  unit_amount: 100, // $1.00 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONT_END_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONT_END_URL}/fail`,
      metadata: {
        userId: userId || "",
        reportId: reportId || "",
      },
    });
    // Save payment session data to the database
    await Payment.create({
      userId,
      reportId,
      amount: session.amount_total / 100, // Convert cents to dollars
      method: session.payment_method_types[0],
      currency: session.currency,
      paymentIntentId: session.payment_intent,
      status: session.payment_status,
      sessionId: session.id,
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const webhook = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-03-02",
  });

  try {
    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSessionCompleted = event.data.object;
       
        await Payment.findOneAndUpdate(
          { sessionId: checkoutSessionCompleted.id },
          {
            status: checkoutSessionCompleted.payment_status,
            paymentIntentId: checkoutSessionCompleted.payment_intent,
          },
          { new: true }
        );

        // Update the report status to 'paid'
        if (checkoutSessionCompleted.payment_status === "paid") {
          await Report.findOneAndUpdate(
            { _id: checkoutSessionCompleted.metadata.reportId },
            { userId: checkoutSessionCompleted.metadata.userId },
            { new: true }
          );
        }
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).send(`Webhook Error`);
  }
};

export const getPaymentDetails = async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID is required" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(400).json({ message: "Invlalid Session id" });
    }

    res.status(200).json(session);
  } catch (error) {
    // console.error("Error retrieving payment details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
