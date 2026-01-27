// src/Chat.tsx
import React, { useEffect, useRef, useState } from "react";
import api from "./api";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = {
  id?: string;
  score?: number;
  source?: string;
  doc_title?: string;
  page_start?: number | string;
  page_end?: number | string;
  chapter?: string | null;
  topic?: string | null;
  note?: string | null;
  table_csv_url?: string;
  thumb_url?: string;
  type?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
  sources?: Source[];
};

const isDialogue = (text: string) => {
  if (!text) return false;
  return /(^|\n)\s*User\s*A\s*:/i.test(text) || /(^|\n)\s*User\s*B\s*:/i.test(text);
};

const parseDialogueLines = (text: string) => {
  const lines = text.split(/\r?\n/).map((ln) => ln.trim()).filter(Boolean);
  const parsed: Array<{ speaker: "A" | "B" | null; text: string }> = [];
  for (const ln of lines) {
    const mA = ln.match(/^\s*User\s*A\s*:\s*(.*)$/i);
    const mB = ln.match(/^\s*User\s*B\s*:\s*(.*)$/i);
    if (mA) {
      parsed.push({ speaker: "A", text: mA[1].trim() });
    } else if (mB) {
      parsed.push({ speaker: "B", text: mB[1].trim() });
    } else {
      parsed.push({ speaker: null, text: ln });
    }
  }
  return parsed;
};

const stripSourcesText = (answer: string) => {
  if (!answer) return { body: "", sourcesText: "" };
  const re = /(?:Sources\s*Used\s*:)/i;
  const split = answer.split(re);
  if (split.length <= 1) {
    return { body: answer.trim(), sourcesText: "" };
  }
  const body = split[0].trim();
  const sourcesText = split.slice(1).join("Sources Used:").trim();
  return { body, sourcesText };
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [rec, setRec] = useState<any>(null);
  const [mode, setMode] = useState<"qa" | "discussion">("qa");

  const [openSources, setOpenSources] = useState<Record<number, boolean>>({});
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [scrollVisible, setScrollVisible] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setScrollVisible(!nearBottom);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const SR: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInput(text);
      };
      setRec(recognition);
      setSttSupported(true);
    }
  }, []);

  // start speaking a text and mark which message index it's for
  const speakStart = (text: string, idx: number) => {
    if (!text || !("speechSynthesis" in window)) return;
    // stop any existing speech
    window.speechSynthesis.cancel();
    utterRef.current = new SpeechSynthesisUtterance(text);
    utterRef.current.lang = "en-IN";
    utterRef.current.onend = () => {
      setSpeakingIndex(null);
      setIsPaused(false);
      utterRef.current = null;
    };
    utterRef.current.onerror = () => {
      setSpeakingIndex(null);
      setIsPaused(false);
      utterRef.current = null;
    };
    setSpeakingIndex(idx);
    setIsPaused(false);
    window.speechSynthesis.speak(utterRef.current);
  };

  // pause the current speech (if any)
  const pauseSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // resume if paused
  const resumeSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  // stop and clear utterance
  const stopSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    setIsPaused(false);
    utterRef.current = null;
  };

  // toggle speak/pause/resume for a specific message index
  const handleSpeakToggle = (idx: number, text: string) => {
    // if nothing is active, start this one
    if (speakingIndex === null) {
      speakStart(text, idx);
      return;
    }

    // if this message is currently active:
    if (speakingIndex === idx) {
      if (window.speechSynthesis.paused) {
        resumeSpeech();
      } else if (window.speechSynthesis.speaking) {
        pauseSpeech();
      } else {
        // not speaking (maybe ended) => restart
        speakStart(text, idx);
      }
      return;
    }

    // if some other message is speaking, stop it and start this one
    stopSpeech();
    speakStart(text, idx);
  };

  const toggleSource = (idx: number) => {
    setOpenSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    const now = new Date().toISOString();

    const userMsg: Msg = { role: "user", content, ts: now };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const historyForBackend = newMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post("/chat", {
        message: content,
        history: historyForBackend,
        mode,
      });

      const rawAnswer = (res.data.answer as string) || "";
      const { body: displayAnswer } = stripSourcesText(rawAnswer);
      const sources: Source[] = Array.isArray(res.data.sources)
        ? res.data.sources
        : [];

      const assistantMsg: Msg = {
        role: "assistant",
        content: displayAnswer,
        ts: new Date().toISOString(),
        sources,
      };

      setMessages((msgs) => [...msgs, assistantMsg]);
      // auto-play the answer for the newly added assistant message
      // its index will be messages.length (since userMsg was appended then assistant appended)
      const newIndex = messages.length; // current messages length; assistant will be at this index
      // slight delay to ensure rendering
      setTimeout(() => speakStart(displayAnswer, newIndex), 150);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "Sorry, I couldn't process that question. Please try again in a moment.";
      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: detail,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceInput = () => {
    if (!rec) {
      alert("Voice input not supported in this browser.");
      return;
    }
    (window as any).speechSynthesis.cancel();
    try {
      rec.start();
    } catch (err) {
      console.error(err);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setOpenSources({});
    setInput("");
    setSpeakingIndex(null);
    setIsPaused(false);
    stopSpeech();
  };

  const regenerateLast = async () => {
    if (loading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setInput(lastUser.content);
    await sendMessage();
  };

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1200);
    } catch {}
  };

  return (
    <div
      className="chat-card"
      role="region"
      aria-label="Chat with CA tutor"
      style={{
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <div className="chat-card-header">
        <div className="header-left">
          <h2 className="chat-title">CA Tutor — Ask your CA doubts</h2>
          <p className="chat-subtitle">
            Grounded answers from study materials — concise, exam-focused.
          </p>
        </div>

        <div className="header-right">
          <div className="chat-header-actions">
            <div
              className="chat-mode-toggle"
              role="tablist"
              aria-label="Answer mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "qa"}
                className={
                  mode === "qa" ? "chat-mode-btn chat-mode-btn-active" : "chat-mode-btn"
                }
                onClick={() => setMode("qa")}
              >
                Simple Q&amp;A
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "discussion"}
                className={
                  mode === "discussion" ? "chat-mode-btn chat-mode-btn-active" : "chat-mode-btn"
                }
                onClick={() => setMode("discussion")}
              >
                Discussion
              </button>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={clearChat}
              title="Clear chat"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="chat-messages" aria-live="polite" ref={chatRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-title">Start by asking a CA question</p>
            <p className="empty-sub">Type your question and press Send.</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isAssistant = m.role === "assistant";
          const dialogue =
            isAssistant && isDialogue(m.content) ? parseDialogueLines(m.content) : null;

          return (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "chat-bubble-row chat-bubble-row-user"
                  : "chat-bubble-row chat-bubble-row-assistant"
              }
            >
              {isAssistant && (
                <div className="chat-avatar-video" aria-hidden="true">
                  <div className="chat-avatar-wave" />
                </div>
              )}

              <div
                className={
                  m.role === "user"
                    ? "chat-bubble chat-bubble-user"
                    : "chat-bubble chat-bubble-assistant"
                }
              >
                <div className="chat-bubble-role">
                  {m.role === "user" ? "You" : "Tutor"}
                </div>

                {dialogue ? (
                  <div className="dialogue-block">
                    {dialogue.map((ln, idx) => (
                      <div
                        key={idx}
                        className={`dialogue-line dialogue-line-${
                          ln.speaker === "A" ? "a" : ln.speaker === "B" ? "b" : "neutral"
                        }`}
                        role="article"
                        aria-label={ln.speaker ? `User ${ln.speaker}` : "Dialogue"}
                      >
                        <span className="dialogue-speaker">
                          {ln.speaker ? `User ${ln.speaker}: ` : ""}
                        </span>
                        <span className="dialogue-text">{ln.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chat-bubble-content markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>

                )}

                <div className="chat-bubble-footer">
                  {m.ts && (
                    <div className="chat-bubble-time">
                      {new Date(m.ts).toLocaleTimeString()}
                    </div>
                  )}

                  {isAssistant && (
                    <div className="message-actions" role="group" aria-label="Message actions">
                      <button
                        className="action-btn"
                        onClick={() => handleSpeakToggle(i, m.content)}
                        title={speakingIndex === i ? (isPaused ? "Resume" : "Pause") : "Speak"}
                      >
                        {speakingIndex === i ? (isPaused ? "Resume" : "Pause") : "Speak"}
                      </button>

                      <button
                        className="action-btn"
                        onClick={() => stopSpeech()}
                        title="Stop audio"
                      >
                        Stop
                      </button>

                      <button
                        className="action-btn"
                        title={openSources[i] ? "Hide sources" : "Show sources"}
                        onClick={() => toggleSource(i)}
                      >
                        {openSources[i] ? "Hide sources" : "Sources"}
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleCopy(i, m.content)}
                        title={copiedIndex === i ? "Copied" : "Copy"}
                      >
                        {copiedIndex === i ? "Copied" : "Copy"}
                      </button>
                      <button
                        className="action-btn"
                        onClick={regenerateLast}
                        title="Regenerate"
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>

                {isAssistant && m.sources && m.sources.length > 0 && openSources[i] && (
                  <div className="chat-sources" aria-label="Sources">
                    <div className="chat-sources-title">Sources used</div>
                    <ul className="chat-sources-list">
                      {m.sources.map((s, idx) => {
                        const title = s.doc_title || s.source || "Unknown source";
                        const page =
                          s.page_start &&
                          (s.page_end && s.page_end !== s.page_start
                            ? `Pages ${s.page_start}-${s.page_end}`
                            : `Page ${s.page_start}`);
                        const chapterTopic =
                          s.chapter || s.topic
                            ? [s.chapter, s.topic].filter(Boolean).join(" • ")
                            : null;
                        return (
                          <li key={idx} className="chat-source-item">
                            <div className="chat-source-title">{title}</div>
                            <div className="chat-source-meta">
                              {chapterTopic && (
                                <span className="chat-source-meta-item">{chapterTopic}</span>
                              )}
                              {page && (
                                <span className="chat-source-meta-item">{page}</span>
                              )}
                              {typeof s.score === "number" && (
                                <span className="chat-source-meta-item"> score {s.score.toFixed(3)}</span>
                              )}
                              {s.note && <span className="chat-source-meta-item"> {s.note}</span>}
                              {s.table_csv_url && (
                                <span className="chat-source-meta-item">
                                  <a href={s.table_csv_url} target="_blank" rel="noreferrer">
                                    Open table CSV
                                  </a>
                                </span>
                              )}
                              {s.thumb_url && (
                                <span className="chat-source-meta-item">
                                  <img
                                    src={s.thumb_url}
                                    alt="Figure thumbnail"
                                    style={{ maxWidth: 180, borderRadius: 6, border: "1px solid #eee" }}
                                  />
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-bubble-row chat-bubble-row-assistant">
            <div className="chat-avatar-video chat-avatar-video-active" aria-hidden="true">
              <div className="chat-avatar-wave" />
            </div>
            <div className="chat-bubble chat-bubble-assistant">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar" role="search" aria-label="Ask question">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your CA question here… (e.g. 'Explain Ind AS 7 briefly')"
          aria-label="Question input"
        />
        {sttSupported && (
          <button
            type="button"
            className="btn-icon"
            onClick={startVoiceInput}
            title="Voice input"
            aria-label="Voice input"
          >
            🎙
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={loading}>
          {loading ? "Thinking…" : "Send"}
        </button>
        {scrollVisible && (
          <button type="button" className="scroll-bottom-btn" onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}>
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
};

export default Chat;
