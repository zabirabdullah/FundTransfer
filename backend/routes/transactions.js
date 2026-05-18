import express from "express";
import Transaction from "../models/Transaction.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

const router = express.Router();

const AMARPAY_BASE_URL = "https://sandbox.aamarpay.com";
const AMARPAY_JSONPOST_URL = `${AMARPAY_BASE_URL}/jsonpost.php`;

const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const isSuccessStatus = (status) => {
  if (!status) return false;
  const normalized = String(status).trim().toLowerCase();
  return [
    "success",
    "paid",
    "completed",
    "complete",
    "ok",
    "confirmed",
  ].includes(normalized);
};

const isFailureStatus = (status) => {
  if (!status) return false;
  const normalized = String(status).trim().toLowerCase();
  return [
    "failed",
    "fail",
    "cancel",
    "cancelled",
    "canceled",
    "declined",
    "rejected",
  ].includes(normalized);
};

const buildCallbackUrl = (req) =>
  `${req.protocol}://${req.get("host")}/api/transactions/online/callback`;

const parseMaybeJson = async (response) => {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

// Create a new transaction
router.post("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message:
          "Database is not connected. Check backend DB connection settings.",
      });
    }

    const {
      name,
      email,
      phone,
      amount,
      currency,
      note,
      payment_type,
      payment_method,
      sender_account,
      manual_txn_id,
    } = req.body;

    if (!name || !email || !phone || !amount || !payment_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const tran_id = uuidv4();

    const tx = new Transaction({
      tran_id,
      name,
      email,
      phone,
      amount,
      currency: currency || "BDT",
      note,
      payment_type,
      payment_method,
      sender_account,
      manual_txn_id,
      status: "initiated",
    });

    await tx.save();

    return res.status(201).json({ tran_id: tx.tran_id, status: tx.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// Get transaction by tran_id
router.get("/:tran_id", async (req, res) => {
  try {
    const { tran_id } = req.params;
    const tx = await Transaction.findOne({ tran_id });
    if (!tx) return res.status(404).json({ message: "Not found" });
    return res.json(tx);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.post("/online/pay", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message:
          "Database is not connected. Check backend DB connection settings.",
      });
    }

    const { name, email, phone, amount, note } = req.body;

    if (!name || !email || !phone || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const tran_id = uuidv4();

    const tx = new Transaction({
      tran_id,
      name,
      email,
      phone,
      amount: parsedAmount,
      currency: "BDT",
      note,
      payment_type: "online",
      payment_method: "aamarpay",
      status: "pending",
    });

    await tx.save();

    const storeId = process.env.AMARPAY_STORE_ID;
    const signatureKey = process.env.AMARPAY_SIGNATURE_KEY;

    if (!storeId || !signatureKey) {
      await Transaction.findOneAndUpdate(
        { tran_id },
        { $set: { status: "failed" } },
      );

      return res.status(500).json({
        tran_id,
        message:
          "Missing AMARPAY_STORE_ID or AMARPAY_SIGNATURE_KEY in backend .env",
      });
    }

    const paymentPayload = {
      store_id: storeId,
      signature_key: signatureKey,
      tran_id,
      amount: String(parsedAmount),
      currency: "BDT",
      desc: note || "Online fund transfer",
      cus_name: name,
      cus_email: email,
      cus_add1: "N/A",
      cus_add2: "N/A",
      cus_city: "N/A",
      cus_state: "N/A",
      cus_postcode: "0000",
      cus_country: "Bangladesh",
      cus_phone: phone,
      type: "json",
      success_url: buildCallbackUrl(req),
      fail_url: buildCallbackUrl(req),
      cancel_url: buildCallbackUrl(req),
    };

    const gatewayController = new AbortController();
    const gatewayTimeout = setTimeout(() => gatewayController.abort(), 15000);

    let gatewayResponse;
    try {
      gatewayResponse = await fetch(AMARPAY_JSONPOST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
        signal: gatewayController.signal,
      });
    } catch (fetchError) {
      await Transaction.findOneAndUpdate(
        { tran_id },
        { $set: { status: "failed" } },
      );

      if (fetchError.name === "AbortError") {
        return res.status(504).json({
          tran_id,
          message: "aamarPay request timed out",
        });
      }

      throw fetchError;
    } finally {
      clearTimeout(gatewayTimeout);
    }

    const gatewayData = await parseMaybeJson(gatewayResponse);

    if (
      !gatewayResponse.ok ||
      gatewayData?.result === false ||
      gatewayData?.status === false
    ) {
      await Transaction.findOneAndUpdate(
        { tran_id },
        {
          $set: {
            status: "failed",
            pg_txnid: pickFirstDefined(
              gatewayData?.pg_txnid,
              gatewayData?.transaction_id,
            ),
          },
        },
      );

      return res.status(502).json({
        tran_id,
        message:
          gatewayData?.message ||
          gatewayData?.error ||
          gatewayData?.raw ||
          "aamarPay request failed",
        gateway: gatewayData,
      });
    }

    const paymentUrl = pickFirstDefined(
      gatewayData?.payment_url,
      gatewayData?.paymentUrl,
      gatewayData?.url,
      gatewayData?.checkout_url,
      gatewayData?.payment_link,
      gatewayData?.data?.payment_url,
      gatewayData?.data?.url,
      gatewayData?.track
        ? `${AMARPAY_BASE_URL}/paynow.php?track=${gatewayData.track}`
        : undefined,
      `${AMARPAY_BASE_URL}/paynow.php?track=${tran_id}`,
    );

    return res.status(201).json({
      tran_id,
      status: tx.status,
      payment_url: paymentUrl,
      gateway: gatewayData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.all("/online/callback", async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };
    const tran_id = pickFirstDefined(
      payload.tran_id,
      payload.track,
      payload.track_id,
      payload.mer_txnid,
      payload.transaction_id,
    );

    if (!tran_id) {
      return res.status(400).json({ message: "Missing transaction reference" });
    }

    const statusSource = pickFirstDefined(
      payload.status,
      payload.pay_status,
      payload.txn_status,
      payload.payment_status,
    );

    const updatedStatus = isSuccessStatus(statusSource)
      ? "completed"
      : isFailureStatus(statusSource)
        ? "failed"
        : "pending";

    const updateData = {
      status: updatedStatus,
      pg_txnid: pickFirstDefined(
        payload.pg_txnid,
        payload.txnid,
        payload.transaction_id,
        payload.mer_txnid,
      ),
      card_type: pickFirstDefined(
        payload.card_type,
        payload.cardbrand,
        payload.cardBrand,
      ),
      store_amount: pickFirstDefined(
        payload.store_amount,
        payload.amount,
        payload.pay_amount,
      ),
      pay_time: pickFirstDefined(
        payload.pay_time,
        payload.payment_time,
        payload.time,
      ),
    };

    const tx = await Transaction.findOneAndUpdate(
      { tran_id },
      { $set: updateData },
      { new: true },
    );

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const isBrowserRequest = String(req.headers.accept || "").includes(
      "text/html",
    );

    if (isBrowserRequest) {
      return res.status(200).send(`
        <html>
          <head><title>Payment ${updatedStatus}</title></head>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>Payment ${updatedStatus}</h2>
            <p>Transaction ID: ${tx.tran_id}</p>
            <p>Gateway reference: ${updateData.pg_txnid || "N/A"}</p>
            <p>You can return to the app now.</p>
          </body>
        </html>
      `);
    }

    return res.json({
      tran_id: tx.tran_id,
      status: tx.status,
      pg_txnid: tx.pg_txnid,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;
