import React from "react";
import axios from "axios";

const PaymentPage = () => {
  const handlePayment = async () => {
    try {
      const amount = 600; // ₹500
      const { data } = await axios.post("https://razorpay-dummy-4.onrender.com/api/order", { amount });

      const options = {
        key: "rzp_test_RXIZlMwe6IJELU", // Only Key ID here, not secret!
        amount: data.amount,
        currency: data.currency,
        name: "MERN Razorpay",
        description: "Test Transaction",
        order_id: data.id,
        handler: async function (response) {
          const verifyRes = await axios.post("https://razorpay-dummy-4.onrender.comapi/payment/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount,
            email: "test@example.com",
            contact: "",
          });

          if (verifyRes.data.success) alert("✅ Payment Successful!");
          else alert("❌ Payment verification failed");
        },
        prefill: {
          name: "John Doe",
          email: "test@example.com",
          contact: "9876543210",
        },
        theme: {
          color: "#bde0f1ff",
        },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (error) {
      console.error(error);
      alert("Payment failed to start");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Pay ₹500 using Razorpay</h2>
      <button onClick={handlePayment} style={{ padding: "10px 20px" }}>
        Pay Now
      </button>
    </div>
  );
};

export default PaymentPage;
