import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import transactionsRouter from "./routes/transactions.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.CONNECTION ||
  "mongodb://127.0.0.1:27017/fundtransfer";
const PORT = process.env.PORT || 5000;

// Prevent mongoose from buffering write operations when DB is disconnected.
mongoose.set("bufferCommands", false);

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/transactions", transactionsRouter);

app.get("/", (req, res) => res.send("Fund Transfer backend running"));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
