import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// In-memory conversation history (resets on server restart — fine for v1)
let conversationHistory = [];

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  conversationHistory.push({ role: "user", content: message });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: "openai/gpt-oss-120b",
    max_tokens: 1024,
    messages: [
      { role: "system", content: "You are Jarvis, a helpful, concise voice assistant. Keep replies short and conversational since they'll be spoken aloud." },
      ...conversationHistory,
    ],
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error("Groq API error:", data);
  return res.status(500).json({ error: "AI request failed" });
}

const reply = data.choices[0].message.content;
    conversationHistory.push({ role: "assistant", content: reply });

    // Keep history from growing forever
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reset", (req, res) => {
  conversationHistory = [];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jarvis running on http://localhost:${PORT}`));