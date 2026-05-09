import { useState, useRef, useEffect } from "react";

export default function ChatPanel({ onChatAction }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "嗨！我是 PixWave，你的 AI 音乐 DJ。想听什么风格？或者聊聊你现在的心情？",
      }]);
    }
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();

      if (json.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply }]);
        if (json.data.action && onChatAction) {
          onChatAction(json.data.action);
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "抱歉，信号不太好，能再说一遍吗？" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "网络开小差了，稍后再试试？" }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={listRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-bubble">{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant">
            <div className="chat-bubble typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="跟 PixWave 聊聊..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button className="chat-send-btn" onClick={send} disabled={sending || !input.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
