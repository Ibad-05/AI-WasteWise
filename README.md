# AI WasteWise

## AI-Powered Waste Segregation & Disposal Assistant

AI WasteWise is a web-based AI assistant that helps users identify everyday waste, classify it into an appropriate waste category, and understand how it can be disposed of, recycled, reused, or handled responsibly.

The project applies multimodal and conversational AI to a practical sustainability problem and is aligned with **UN Sustainable Development Goal 12 — Responsible Consumption and Production**.

---

## 🌱 Problem

Many people are unsure how to correctly identify and dispose of everyday waste.

Items such as plastic containers, food waste, clothing, electronic components, glass, and other materials may require different disposal or recycling methods. Incorrect segregation can cause recyclable materials to become contaminated and reduce the effectiveness of waste-management processes.

AI WasteWise aims to make waste identification and disposal guidance easier and more accessible.

---

## 💡 Solution

Users can upload an image of a waste item and AI WasteWise analyzes it using multimodal AI.

The system:

1. Analyzes the uploaded image.
2. Identifies the waste item.
3. Classifies it into a waste category.
4. Provides an AI-generated confidence level.
5. Gives disposal guidance.
6. Explains the reasoning behind the recommendation.
7. Allows users to ask follow-up questions using **Ask WasteWise**.

### Supported Waste Categories

- Organic / Biodegradable
- Plastic
- Paper / Cardboard
- Glass
- Metal
- E-waste
- Hazardous / Special
- General / Residual
- Textile / Clothing

> Disposal rules can vary by location. Users should follow their local waste-management and recycling guidelines.

---

## 🤖 AI Technology

AI WasteWise uses:

- **IBM watsonx.ai**
- **Meta Llama 4 Maverick** multimodal AI model
- **IBM BOB** for AI-assisted development
- AI-assisted prompt engineering
- Multimodal image analysis
- Conversational AI

The application uses IBM watsonx.ai to process waste images and generate structured waste identification and disposal guidance.

---

## 🏗️ Architecture

```text
User
  ↓
Upload Waste Image
  ↓
AI WasteWise Web Application
  ↓
IBM watsonx.ai
  ↓
Llama 4 Maverick
  ↓
Waste Identification
  ↓
Waste Classification
  ↓
Disposal Guidance + Explanation
  ↓
User