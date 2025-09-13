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
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", 
    "https://your-frontend-domain.vercel.app", // Replace with your actual frontend URL
  ],
  credentials: true
}));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Backend is working 🚀" });
});

// MongoDB connection for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false, // Disable mongoose buffering for serverless
      maxPoolSize: 1, // Maintain up to 1 socket connection for serverless
    });
    
    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

// Middleware to ensure DB connection on each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection failed:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// API Routes (after DB middleware)
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Only start server locally
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}

export default app;