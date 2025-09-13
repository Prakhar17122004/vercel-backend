import express from "express";
import Note from "../models/Note.js";
import { protect } from "../middleware/authMiddleware.js";
import axios from "axios";
import dotenv from "dotenv";
import natural from "natural";

dotenv.config();

const router = express.Router();

// =======================
// Add a new note
// =======================
// Auto-tag generator
function generateTags(text, topN = 3) {
  const words = text.toLowerCase().match(/\b\w+\b/g);
  if (!words) return [];

  const stopwords = new Set(["the", "is", "and", "of", "a", "to", "in", "it", "that", "on"]);
  const freq = {};

  words.forEach((w) => {
    if (!stopwords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });

  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a]) // sort by frequency
    .slice(0, topN); // pick top N
}

router.post("/", protect, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // ✅ Auto-generate tags if not provided
    const finalTags = tags && tags.length > 0 ? tags : generateTags(content);

    const note = new Note({
      title,
      content,
      tags: finalTags,
      userId: req.user.id,
    });

    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: "Error saving note", error: err.message });
  }
});

// =======================
// Update note
// =======================
router.put("/:id", protect, async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, content, tags: tags || [] },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(updatedNote);
  } catch (err) {
    res.status(500).json({ message: "Error updating note", error: err.message });
  }
});

// =======================
// Get all notes
// =======================
router.get("/", protect, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notes", error: err.message });
  }
});

// =======================
// Delete note
// =======================
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedNote = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting note", error: err.message });
  }
});

// =======================
// Pin / Unpin note
// =======================
router.patch("/:id/pin", protect, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    note.isPinned = !note.isPinned;
    await note.save();

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});






// Simple extractive summarizer
function summarizeText(text, sentenceCount = 3) {
  if (!text || text.trim().length === 0) return "No content to summarize.";

  // 1. Split into sentences
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

  // 2. Tokenize and count word frequencies
  const tokenizer = new natural.WordTokenizer();
  const freq = {};
  const stopWords = new Set(natural.stopwords);

  sentences.forEach((s) => {
    const words = tokenizer.tokenize(s.toLowerCase());
    words.forEach((w) => {
      if (!stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
  });

  // 3. Score each sentence
  const scores = sentences.map((s) => {
    const words = tokenizer.tokenize(s.toLowerCase());
    let score = 0;
    words.forEach((w) => {
      if (freq[w]) score += freq[w];
    });
    return { sentence: s, score };
  });

  // 4. Pick top N sentences
  const sorted = scores.sort((a, b) => b.score - a.score);
  const summary = sorted.slice(0, sentenceCount).map((s) => s.sentence.trim());

  return summary.join(" ");
}

// routes/notes.js

router.post("/:id/summarize", protect, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // ✅ Simple TextRank or LLM summarization (you already added)
    const summary = await summarizeText(note.content);

    // ✅ Overwrite content with summary
    note.content = summary;
    await note.save();

    res.json({ message: "Note summarized successfully", note });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ message: "Failed to summarize note" });
  }
});



export default router;
