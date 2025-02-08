require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Function to transcribe audio using Whisper
const transcribeAudio = (filePath) => {
  return new Promise((resolve, reject) => {
    exec(`whisper ${filePath} --model small --language English --output_format txt`, (error, stdout, stderr) => {
      if (error) {
        reject(`Whisper Error: ${stderr}`);
      } else {
        const transcript = fs.readFileSync(`${filePath}.txt`, "utf-8").trim();
        resolve(transcript);
      }
    });
  });
};

// API Endpoint to transcribe and summarize text
app.post("/transcribe", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const summary = await generateSummaryWithGemini(text);
    const importantDates = await extractDatesWithGemini(summary);

    res.json({ summary, importantDates });
  } catch (error) {
    console.error("Error transcribing text:", error);
    res.status(500).json({ error: "Failed to process text." });
  }
});

// Function to generate a summary using Gemini API
const generateSummaryWithGemini = async (text) => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in environment variables.");
    return "Error: API key not set.";
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: `Summarize this text concisely: "${text}"` }] }],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    return "Failed to generate summary.";
  }
};

// Function to extract dates from text using Gemini API
const extractDatesWithGemini = async (text) => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in environment variables.");
    return [];
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: `Extract all important dates in YYYY-MM-DD format from: "${text}"` }] }],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const extractedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/g;
    return extractedText.match(dateRegex) || [];
  } catch (error) {
    console.error("Error extracting dates with Gemini:", error);
    return [];
  }
};

// API Endpoint to handle audio upload, transcription, summarization, and date extraction
app.post("/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

    const audioPath = req.file.path;
    const text = await transcribeAudio(audioPath);
    const summary = await generateSummaryWithGemini(text);
    const importantDates = await extractDatesWithGemini(summary);

    fs.unlinkSync(audioPath); // Cleanup file after processing

    res.json({ message: "Processing complete", text, summary, importantDates });
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: "Failed to process audio." });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
