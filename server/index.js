
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const PORT = process.env.PORT || 5000;
const MODEL_ID = "gemini-3.8-flash";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

// --------------------------------------------------
// Gemini configuration
// --------------------------------------------------

function getGeminiConfig() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from server/.env");
  }

  return {
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    timeout: 120000,
  };
}

// --------------------------------------------------
// Extract text from Interactions API response
// --------------------------------------------------

function extractText(response) {
  if (typeof response.data?.output_text === "string") {
    return response.data.output_text.trim();
  }

  const steps = response.data?.steps || [];

  return steps
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function cleanJson(text) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "AI WasteWise Backend Running",
    provider: "Google Gemini",
    model: MODEL_ID,
  });
});

// --------------------------------------------------
// Analyze waste image
// --------------------------------------------------

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  const requestStartedAt = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No image was uploaded.",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        error: "Please upload a valid image.",
      });
    }

    const prompt = `
You are the AI engine for a sustainability project called AI WasteWise.

Analyze the uploaded waste image.

Identify the main waste item visible and classify it into exactly ONE category:

1. Organic / Biodegradable
2. Plastic
3. Paper / Cardboard
4. Glass
5. Metal
6. E-waste
7. Hazardous / Special
8. General / Residual
9. Textile / Clothing

Return ONLY valid JSON with this exact structure:

{
  "item": "name of the waste item",
  "category": "one category from the list",
  "confidence": 0,
  "disposal": "general disposal recommendation",
  "explanation": "short explanation"
}

Rules:
- Clothing, fabric, garments, and textiles must be classified as "Textile / Clothing".
- Confidence must be a number from 0 to 100.
- If the item cannot be identified reliably, use:
  "item": "Uncertain"
  "category": "Uncertain"
  "confidence": 0
- Never invent details.
- Disposal recommendations must be general.
- Mention that local waste-management rules may vary when appropriate.
- Keep the explanation short.
`;

    const imageData = req.file.buffer.toString("base64");

    console.info("[/api/analyze] Gemini request started", {
      model: MODEL_ID,
      mimeType: req.file.mimetype,
      imageBytes: req.file.size,
    });

    const response = await axios.post(
      GEMINI_URL,
      {
        model: MODEL_ID,
        input: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image",
            data: imageData,
            mime_type: req.file.mimetype,
          },
        ],
      },
      getGeminiConfig()
    );

    console.info("[/api/analyze] Gemini request completed", {
      status: response.status,
      elapsedMs: Date.now() - requestStartedAt,
    });

    const modelText = extractText(response);

    if (!modelText) {
      console.error(
        "Empty Gemini image response:",
        JSON.stringify(response.data, null, 2)
      );

      return res.status(502).json({
        error: "Gemini returned an empty response.",
      });
    }

    console.log("===== GEMINI IMAGE RESPONSE =====");
    console.log(modelText);
    console.log("=================================");

    let result;

    try {
      result = JSON.parse(cleanJson(modelText));
    } catch (parseError) {
      console.error("Could not parse Gemini response:", modelText);

      return res.status(502).json({
        error: "AI returned an unexpected response format.",
      });
    }

    return res.json({
      success: true,
      result,
      model: MODEL_ID,
      provider: "Google Gemini",
    });
  } catch (error) {
    console.error("[/api/analyze] Gemini request failed", {
      status: error.response?.status,
      code: error.code,
      elapsedMs: Date.now() - requestStartedAt,
      response: error.response?.data,
      message: error.message,
    });

    return res.status(500).json({
      error: "Failed to analyze the image.",
      details:
        error.response?.data?.error?.message || error.message,
    });
  }
});

// --------------------------------------------------
// Chat with WasteWise assistant
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body || {};

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        error: "question is required.",
      });
    }

    const systemPrompt = `
You are WasteWise, a helpful AI assistant specialising in
waste sorting, recycling, and disposal guidance.

Answer the user's question clearly and concisely.

Always remind the user that disposal guidance can vary by
location and they should follow their local waste-management rules.

Keep answers focused on waste, recycling, sustainability,
and environmental topics.
`;

    const response = await axios.post(
      GEMINI_URL,
      {
        model: MODEL_ID,
        system_instruction: systemPrompt,
        generation_config: {
          max_output_tokens: 600,
        },
        input: question.trim(),
      },
      getGeminiConfig()
    );

    const answer = extractText(response);

    if (!answer) {
      console.error(
        "Empty Gemini chat response:",
        JSON.stringify(response.data, null, 2)
      );

      return res.status(502).json({
        error: "Gemini returned an empty response.",
      });
    }

    console.log("===== GEMINI CHAT RESPONSE =====");
    console.log(answer);
    console.log("================================");

    return res.json({ answer });
  } catch (error) {
    console.error("===== GEMINI CHAT API ERROR =====");
    console.error("Status:", error.response?.status);
    console.error(
      "Response:",
      JSON.stringify(error.response?.data, null, 2)
    );
    console.error("Message:", error.message);
    console.error("=================================");

    return res.status(500).json({
      error: "Failed to get a response from the AI assistant.",
      details:
        error.response?.data?.error?.message || error.message,
    });
  }
});

// --------------------------------------------------
// Handle upload and other Express errors
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Backend error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(
    error instanceof multer.MulterError ? 400 : 500
  ).json({
    error:
      error instanceof multer.MulterError
        ? error.message
        : "An unexpected backend error occurred.",
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`AI WasteWise backend running on port ${PORT}`);
  console.log(`AI provider: Google Gemini (${MODEL_ID})`);
});
