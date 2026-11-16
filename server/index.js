
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Groq = require("groq-sdk");

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
const MODEL_ID = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

// --------------------------------------------------
// Groq configuration
// --------------------------------------------------

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing from server/.env");
  }

  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// --------------------------------------------------
// Extract text from a Groq chat completion response
// --------------------------------------------------

function extractText(response) {
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
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
    provider: "Groq",
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

    console.info("[/api/analyze] Groq request started", {
      model: MODEL_ID,
      mimeType: req.file.mimetype,
      imageBytes: req.file.size,
    });

    const response = await getGroqClient().chat.completions.create({
      model: MODEL_ID,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify and classify the waste item in this image.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${req.file.mimetype};base64,${imageData}`,
              },
            },
          ],
        },
      ],
    });

    console.info("[/api/analyze] Groq request completed", {
      status: "completed",
      elapsedMs: Date.now() - requestStartedAt,
    });

    const modelText = extractText(response);

    if (!modelText) {
      console.error(
        "Empty Groq image response:",
        JSON.stringify(response, null, 2)
      );

      return res.status(502).json({
        error: "Groq returned an empty response.",
      });
    }

    console.log("===== GROQ IMAGE RESPONSE =====");
    console.log(modelText);
    console.log("=================================");

    let result;

    try {
      result = JSON.parse(cleanJson(modelText));
    } catch (parseError) {
      console.error("Could not parse Groq response:", modelText);

      return res.status(502).json({
        error: "AI returned an unexpected response format.",
      });
    }

    return res.json({
      success: true,
      result,
      model: MODEL_ID,
      provider: "Groq",
    });
  } catch (error) {
    const status = error.status || error.response?.status;

    console.error("[/api/analyze] Groq request failed", {
      status,
      code: error.code,
      elapsedMs: Date.now() - requestStartedAt,
      response: error.response?.data || error.error,
      message: error.message,
    });

    return res.status(status === 429 ? 429 : 500).json({
      error:
        status === 429
          ? "The AI service is rate limited. Please try again later."
          : "Failed to analyze the image.",
      details: error.response?.data?.error?.message || error.message,
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

    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter(
            (message) =>
              (message?.role === "user" ||
                message?.role === "assistant") &&
              typeof message?.content === "string"
          )
          .map((message) => ({
            role: message.role,
            content: message.content.trim(),
          }))
          .filter((message) => message.content)
      : [];

    const response = await getGroqClient().chat.completions.create({
      model: MODEL_ID,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...history,
        {
          role: "user",
          content: question.trim(),
        },
      ],
    });

    const answer = extractText(response);

    if (!answer) {
      console.error(
        "Empty Groq chat response:",
        JSON.stringify(response, null, 2)
      );

      return res.status(502).json({
        error: "Groq returned an empty response.",
      });
    }

    console.log("===== GROQ CHAT RESPONSE =====");
    console.log(answer);
    console.log("================================");

    return res.json({ answer });
  } catch (error) {
    const status = error.status || error.response?.status;

    console.error("===== GROQ CHAT API ERROR =====");
    console.error("Status:", status);
    console.error(
      "Response:",
      JSON.stringify(error.response?.data || error.error, null, 2)
    );
    console.error("Message:", error.message);
    console.error("=================================");

    return res.status(status === 429 ? 429 : 500).json({
      error:
        status === 429
          ? "The AI service is rate limited. Please try again later."
          : "Failed to get a response from the AI assistant.",
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
  console.log(`AI provider: Groq (${MODEL_ID})`);
});
