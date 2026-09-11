import { useEffect, useRef, useState } from "react";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const DISCLAIMER =
  "Disposal guidance can vary by location. Follow your local waste-management rules.";

const API_URL = "http://localhost:5000/api/chat";

export default function WasteChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text:
        "Hi! I'm the WasteWise AI Assistant, powered by IBM watsonx.ai. Ask me about sorting, recycling, or disposing of waste items — for example, try \"How do I dispose of a plastic bottle?\" or \"What do I do with old batteries?\"",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: trimmedQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            `Server error ${response.status}`
        );
      }

      const answer =
        data?.answer ||
        data?.response ||
        data?.message ||
        data?.result?.answer ||
        data?.result ||
        "I couldn't generate an answer right now. Please try again.";

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: String(answer),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Ask WasteWise error:", error);

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text:
          "Sorry, I couldn't connect to the WasteWise AI service. Please make sure the backend is running and try again.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendQuestion();
    }
  };

  return (
    <section
      id="ask"
      style={{
        padding: "80px 20px",
        background: "#f8faf9",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#dcfce7",
            color: "#15803d",
            fontSize: "12px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          AI ASSISTANT
        </div>

        <h2
          style={{
            fontSize: "32px",
            fontWeight: 800,
            margin: "0 0 12px",
            color: "#111827",
          }}
        >
          Ask WasteWise
        </h2>

        <p
          style={{
            maxWidth: "650px",
            margin: "0 auto 32px",
            color: "#64748b",
            lineHeight: 1.6,
            fontSize: "15px",
          }}
        >
          Have a question about sorting, recycling, or disposing of
          waste? Ask WasteWise and get AI-powered guidance.
        </p>

        <div
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          <div
            style={{
              height: "360px",
              overflowY: "auto",
              padding: "18px",
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent:
                    message.role === "user"
                      ? "flex-end"
                      : "flex-start",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 15px",
                    borderRadius:
                      message.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      message.role === "user"
                        ? "#16a34a"
                        : "#f1f5f9",
                    color:
                      message.role === "user"
                        ? "#ffffff"
                        : "#334155",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    padding: "12px 15px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  WasteWise is thinking...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div
            style={{
              padding: "14px",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about waste disposal..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "12px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  outline: "none",
                  fontSize: "14px",
                  background: loading ? "#f8fafc" : "#ffffff",
                }}
              />

              <button
                type="button"
                onClick={sendQuestion}
                disabled={loading || !question.trim()}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 18px",
                  background:
                    loading || !question.trim()
                      ? "#86efac"
                      : "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor:
                    loading || !question.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>

            <div
              style={{
                marginTop: "10px",
                padding: "9px 11px",
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              ⚠️ {DISCLAIMER}
            </div>

            <div
              style={{
                marginTop: "8px",
                color: "#64748b",
                fontSize: "10px",
                textAlign: "center",
              }}
            >
              🤖 AI guidance powered by IBM watsonx.ai using Llama 4
              Maverick.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}