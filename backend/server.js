require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const chrono = require("chrono-node");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Function to extract dates accurately using Chrono
const extractDatesFromText = (text) => {
  const parsedDates = chrono.parse(text);
  return parsedDates.map((dateObj) => {
    const date = dateObj.start.date(); // Convert to JavaScript Date
    return date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  });
};

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

// API Endpoint to extract dates and generate summary
app.post("/process-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const summary = await generateSummaryWithGemini(text);
    const extractedDates = extractDatesFromText(summary);

    res.json({ summary, dates: extractedDates });
  } catch (error) {
    console.error("Error processing text:", error);
    res.status(500).json({ error: "Failed to process text." });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));