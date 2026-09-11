require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Store uploaded images in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// IBM watsonx.ai configuration
const IBM_BASE_URL = "https://eu-de.ml.cloud.ibm.com";

const MODEL_ID =
  "meta-llama/llama-4-maverick-17b-128e-instruct-fp8";

const PORT = 5000;

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "AI WasteWise Backend Running 🚀",
  });
});

// --------------------------------------------------
// Get IBM IAM access token
// --------------------------------------------------

async function getIamToken() {
  if (!process.env.IBM_API_KEY) {
    throw new Error("IBM_API_KEY is missing from .env");
  }

  const response = await axios.post(
    "https://iam.cloud.ibm.com/identity/token",
    new URLSearchParams({
      grant_type:
        "urn:ibm:params:oauth:grant-type:apikey",
      apikey: process.env.IBM_API_KEY,
    }).toString(),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  return response.data.access_token;
}

// --------------------------------------------------
// Analyze waste image
// --------------------------------------------------

app.post(
  "/api/analyze",
  upload.single("image"),
  async (req, res) => {
    try {
      // Check uploaded image
      if (!req.file) {
        return res.status(400).json({
          error: "No image was uploaded.",
        });
      }

      // Check project ID
      if (!process.env.IBM_PROJECT_ID) {
        return res.status(500).json({
          error: "IBM_PROJECT_ID is missing from .env",
        });
      }

      // Convert image to Base64
      const imageBase64 =
        req.file.buffer.toString("base64");

      // Get image MIME type
      const mimeType = req.file.mimetype;

      // Get IBM IAM token
      const token = await getIamToken();

      // AI prompt
      const prompt = `
You are the AI engine for a sustainability project called AI WasteWise.

Analyze the uploaded waste image.

Identify the main waste item visible in the image and classify it into exactly ONE of these categories:

1. Organic / Biodegradable
2. Plastic
3. Paper / Cardboard
4. Glass
5. Metal
6. E-waste
7. Hazardous / Special
8. General / Residual
9. Textile / Clothing

Return ONLY valid JSON using exactly this structure:

{
  "item": "name of the waste item",
  "category": "one category from the list",
  "confidence": 0,
  "disposal": "general disposal recommendation",
  "explanation": "short explanation"
}

Rules:

- If the item is clothing, fabric, garments, or any textile material, classify it as "Textile / Clothing".
- confidence must be a number from 0 to 100.
- If you cannot identify the item reliably, use:
  "item": "Uncertain"
  "category": "Uncertain"
  "confidence": 0
- Never invent details that cannot reasonably be determined from the image.
- Disposal recommendations must be general.
- Mention that local waste-management rules may vary when appropriate.
- Keep the explanation short.
`;

      // Send image + prompt to IBM watsonx.ai
      const response = await axios.post(
        `${IBM_BASE_URL}/ml/v1/text/chat?version=2024-10-09`,
        {
          model_id: MODEL_ID,
          project_id: process.env.IBM_PROJECT_ID,

          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],

          max_tokens: 500,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Get AI response
      const modelText =
        response.data?.choices?.[0]?.message?.content;

      if (!modelText) {
        console.error(
          "Unexpected IBM response:",
          JSON.stringify(response.data, null, 2)
        );

        return res.status(500).json({
          error: "IBM returned an empty response.",
        });
      }

      console.log("===== IBM AI RESPONSE =====");
      console.log(modelText);
      console.log("===========================");

      // Remove markdown code fences if the model adds them
      const cleanedText = modelText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Parse JSON
      let result;

      try {
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error(
          "Could not parse IBM response:"
        );
        console.error(modelText);

        return res.status(500).json({
          error:
            "AI returned an unexpected response format.",
          raw: modelText,
        });
      }

      // Send result to frontend
      res.json({
        success: true,
        result: result,
        model: MODEL_ID,
        provider: "IBM watsonx.ai",
      });
    } catch (error) {
      // Detailed IBM error for debugging
      console.error("===== IBM API ERROR =====");
      console.error(
        "Status:",
        error.response?.status
      );

      console.error(
        "Response:",
        JSON.stringify(
          error.response?.data,
          null,
          2
        )
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "========================="
      );

      res.status(500).json({
        error: "Failed to analyze the image.",
        details:
          error.response?.data ||
          error.message,
      });
    }
  }
);

// --------------------------------------------------
// Chat with WasteWise assistant
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required." });
    }

    if (!process.env.IBM_PROJECT_ID) {
      return res.status(500).json({ error: "IBM_PROJECT_ID is missing from .env" });
    }

    const token = await getIamToken();

    const systemPrompt = `You are WasteWise, a helpful AI assistant specialising in waste sorting, recycling, and disposal guidance.
Answer the user's question clearly and concisely.
Always remind the user that disposal guidance can vary by location and they should follow their local waste-management rules.
Keep answers focused on waste, recycling, sustainability, and environmental topics.`;

    const response = await axios.post(
      `${IBM_BASE_URL}/ml/v1/text/chat?version=2024-10-09`,
      {
        model_id: MODEL_ID,
        project_id: process.env.IBM_PROJECT_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question.trim() },
        ],
        max_tokens: 600,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("Unexpected IBM chat response:", JSON.stringify(response.data, null, 2));
      return res.status(500).json({ error: "IBM returned an empty response." });
    }

    console.log("===== IBM CHAT RESPONSE =====");
    console.log(answer);
    console.log("=============================");

    res.json({ answer });
  } catch (error) {
    console.error("===== IBM CHAT API ERROR =====");
    console.error("Status:", error.response?.status);
    console.error("Response:", JSON.stringify(error.response?.data, null, 2));
    console.error("Message:", error.message);
    console.error("==============================");

    res.status(500).json({
      error: "Failed to get a response from the AI assistant.",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `AI WasteWise backend running on port ${PORT}`
  );
});