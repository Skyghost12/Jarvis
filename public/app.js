const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const log = document.getElementById("chat-log");
const micBtn = document.getElementById("mic-btn");

let isSending = false;

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = (role === "user" ? "You: " : "Jarvis: ") + text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function speak(text) {
  // Cancel any speech in progress so replies don't overlap
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;   // speed: 0.5 (slow) to 2 (fast)
  utterance.pitch = 1.0;  // 0 (low) to 2 (high)
  utterance.lang = "en-US";

  window.speechSynthesis.speak(utterance);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isSending) return; // block overlapping submits
  const message = input.value.trim();
  if (!message) return;

  isSending = true;
  addMessage("user", message);
  input.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.reply) {
      addMessage("assistant", data.reply);
      speak(data.reply);
    } else {
      addMessage("assistant", "Something went wrong.");
    }
  } catch (err) {
    addMessage("assistant", "Connection error.");
  } finally {
    isSending = false;
  }
});

// --- Speech-to-text (mic input) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  micBtn.disabled = true;
  micBtn.title = "Speech recognition not supported in this browser";
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;   // stop after one phrase
  recognition.interimResults = false;

  let listening = false;

  micBtn.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }
    window.speechSynthesis.cancel(); // stop Jarvis talking if you interrupt
    recognition.start();
  });

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add("listening");
    micBtn.textContent = "🔴";
  };

  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎤";
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;      // ignore interim/partial results
    const transcript = result[0].transcript.trim();
    if (!transcript) return;
    input.value = transcript;
    form.requestSubmit();
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };
}