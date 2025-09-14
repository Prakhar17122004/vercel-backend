import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import noteRoutes from "./routes/noteRoutes.js";

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors({
  origin: ["https://vercel-frontend-tan-one.vercel.app/login"], // put your actual frontend domain here
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// Routes
app.get("/", (req, res) => {
  res.send("Backend is working 🚀");
});
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connected");

    // 👉 Only start listening locally (not on Vercel)
    if (process.env.NODE_ENV !== "production") {
      app.listen(8000, () => console.log("🚀 Server running on port 8000"));
    }
  })
  .catch((err) => console.error(err));

// ✅ Export the app for Vercel
export default app;
