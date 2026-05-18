import mongoose from "mongoose";

const { Schema, model } = mongoose;

const transactionSchema = new Schema(
  {
    tran_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },
    note: { type: String },
    payment_type: { type: String, enum: ["manual", "online"], required: true },
    payment_method: {
      type: String,
      enum: ["bKash", "Nagad", "Rocket", "Bank Transfer", "aamarpay"],
    },

    // Manual-specific
    sender_account: { type: String },
    manual_txn_id: { type: String },

    // Online/gateway-specific
    pg_txnid: { type: String, index: true, sparse: true },
    card_type: { type: String },
    store_amount: { type: Number },
    pay_time: { type: Date },

    status: {
      type: String,
      enum: ["initiated", "pending", "completed", "failed"],
      default: "initiated",
    },
  },
  { timestamps: true },
);

export default model("Transaction", transactionSchema);
