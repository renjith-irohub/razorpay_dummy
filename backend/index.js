import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "./models/Payment.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

// 🪙 Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🧾 Create Order
app.post("/api/order", async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating Razorpay order");
  }
});

// 🔒 Verify Payment Signature (from frontend)
app.post("/api/payment/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, contact, amount } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      await Payment.create({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount,
        email,
        contact,
        currency: "INR",
        status: "success"
      });
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// 🧷 Razorpay Webhook (for server-side confirmation)
app.post("/api/razorpay/webhook", (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest === req.headers["x-razorpay-signature"]) {
    console.log("✅ Webhook verified successfully");

    const event = req.body.event;
    if (event === "payment.captured") {
      const paymentEntity = req.body.payload.payment.entity;
      console.log("💰 Payment Captured:", paymentEntity);
      // You can update your DB record here if needed
    }
    res.status(200).json({ status: "ok" });
  } else {
    console.log("❌ Invalid webhook signature");
    res.status(400).send("Invalid signature");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
