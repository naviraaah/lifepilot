"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { sendAgentRequest } from "../lib/api";
import styles from "./page.module.css";

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  details?: any;
  routedAgent?: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = "demo_user_123";

  // Voice mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const finalTranscriptRef = useRef<string>("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle voice input processing
  const handleVoiceInput = useCallback(async (text: string) => {
    if (!text.trim() || actionLoading) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setActionLoading(true);

    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const result = await sendAgentRequest(text, userId);
      let responseText = "";

      if (result.status === "error" || result.error) {
        responseText =
          result.summary ||
          result.error ||
          "I'm sorry, something went wrong. Could you try again?";
      } else {
        responseText =
          result.summary ||
          result.details?.response ||
          "I received your message and I'm handling it for you.";
      }

      // Update loading message with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                role: "assistant",
                content: responseText,
                timestamp: new Date(),
                details: result.details,
                routedAgent: result.routedAgent,
                isLoading: false,
                error: result.status === "error" ? responseText : undefined,
              }
            : msg
        )
      );

      // Speak the response
      if (synthesisRef.current && !isSpeaking) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          // Resume listening after speaking
          if (isVoiceMode) {
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 500);
          }
        };

        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          setIsSpeaking(false);
          if (isVoiceMode) {
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 500);
          }
        };

        synthesisRef.current.speak(utterance);
      }
    } catch (err: any) {
      console.error("Error calling agent:", err);
      let errorMessage = "I'm sorry, I couldn't process that. Could you try again?";

      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        errorMessage =
          "I'm having trouble connecting to the server. Please make sure everything is set up correctly.";
      } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        errorMessage = "That took longer than expected. Would you like to try again?";
      } else if (err.response?.data) {
        const data = err.response.data;
        if (data.summary) {
          errorMessage = data.summary;
        } else if (data.error) {
          errorMessage =
            typeof data.error === "string"
              ? data.error
              : data.error.message || errorMessage;
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                role: "assistant",
                content: errorMessage,
                timestamp: new Date(),
                error: errorMessage,
                isLoading: false,
              }
            : msg
        )
      );

      if (synthesisRef.current && !isSpeaking) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(errorMessage);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          if (isVoiceMode) {
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 500);
          }
        };

        synthesisRef.current.speak(utterance);
      }
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, userId, isVoiceMode, isSpeaking, isListening]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            finalTranscriptRef.current = finalTranscript.trim();
            setTranscript(finalTranscript);
          } else {
            setTranscript(interimTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === "no-speech") {
            // Restart listening if no speech detected
            setTimeout(() => {
              if (isVoiceMode && !isSpeaking) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 1000);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          // If we have a final transcript, process it
          const finalText = finalTranscriptRef.current;
          if (finalText && isVoiceMode) {
            finalTranscriptRef.current = "";
            setTranscript("");
            handleVoiceInput(finalText);
          } else if (isVoiceMode && !isSpeaking) {
            // Restart listening if still in voice mode
            setTimeout(() => {
              if (isVoiceMode && !isSpeaking) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 500);
          }
        };

        recognitionRef.current = recognition;
      }

      synthesisRef.current = speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [isVoiceMode, isSpeaking, handleVoiceInput]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    }
  }, [isListening, isSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const startVoiceMode = useCallback(() => {
    setIsVoiceMode(true);
    setTranscript("");
    finalTranscriptRef.current = "";
    // Start listening after a brief delay
    setTimeout(() => {
      if (synthesisRef.current) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance("I'm listening. Share your boring tasks.");
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          // Start listening after greeting
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error("Error starting recognition:", error);
              }
            }
          }, 300);
        };

        synthesisRef.current.speak(utterance);
      }
    }, 300);
  }, []);

  const stopVoiceMode = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    setIsVoiceMode(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript("");
    finalTranscriptRef.current = "";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || actionLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    const currentInput = input.trim();
    setInput("");
    setActionLoading(true);

    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Call unified agent API - it will automatically route to the right agent
      const result = await sendAgentRequest(currentInput, userId);

      // Check if the result indicates an error
      if (result.status === "error" || result.error) {
        const errorMessage =
          result.summary ||
          result.error ||
          "Something went wrong. Please try again.";

        // Update loading message with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessageId
              ? {
                  id: loadingMessageId,
                  role: "assistant",
                  content: errorMessage,
                  timestamp: new Date(),
                  error: errorMessage,
                  isLoading: false,
                }
              : msg
          )
        );
      } else {
        // Remove loading message and add AI response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessageId
              ? {
                  id: loadingMessageId,
                  role: "assistant",
                  content:
                    result.summary ||
                    result.details?.response ||
                    "I received your message.",
                  timestamp: new Date(),
                  details: result.details,
                  routedAgent: result.routedAgent,
                  isLoading: false,
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error("Error calling agent:", err);
      let errorMessage = "Failed to process request. Please try again.";

      // Handle network errors
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        errorMessage =
          "Unable to connect to the server. Please make sure the backend is running on port 3001.";
      } else if (
        err.code === "ECONNABORTED" ||
        err.message?.includes("timeout")
      ) {
        errorMessage = "The request timed out. Please try again.";
      } else if (err.response?.data) {
        // Backend returned an error response
        const data = err.response.data;
        if (data.summary) {
          errorMessage = data.summary;
        } else if (data.error) {
          errorMessage =
            typeof data.error === "string"
              ? data.error
              : data.error.message || "An error occurred";
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Update loading message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                role: "assistant",
                content: errorMessage,
                timestamp: new Date(),
                error: errorMessage,
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickAction = async (prompt: string) => {
    setInput(prompt);
    // Auto-submit after a brief delay to show the text
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/full name logo black.png"
            alt="LifePilot"
            width={180}
            height={40}
            className={styles.logoImage}
            priority
          />
        </Link>
        <nav className={styles.nav}>
          <Link href="/timeline" className={styles.navLink} aria-label="Timeline">
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.navIcon}
            >
              <path
                d="M3 4H17M3 8H17M3 12H13M3 16H9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link href="/settings" className={styles.navLink} aria-label="Settings">
            <Image
              src="/Liam Persona.jpeg"
              alt="Settings"
              width={18}
              height={18}
              className={styles.navIcon}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Greeting - only show when no messages */}
          {!hasMessages && (
            <div className={styles.greeting}>
              <h1>Share your boring tasks</h1>
              <p>Tell me what you need, and I'll handle it for you</p>
            </div>
          )}

          {/* Chat Thread */}
          {hasMessages && (
            <div className={styles.chatThread}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.chatMessage} ${
                    message.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className={styles.messageAvatar}>
                      <Image
                        src="/LOGO colored.png"
                        alt="LifePilot AI"
                        width={36}
                        height={36}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    {message.isLoading ? (
                      <div className={styles.loadingMessage}>
                        <span className={styles.loadingDot}></span>
                        <span className={styles.loadingDot}></span>
                        <span className={styles.loadingDot}></span>
                      </div>
                    ) : message.error ? (
                      <div className={styles.errorMessage}>
                        <p>{message.content}</p>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className={styles.userAvatar}>
                      <Image
                        src="/Liam Persona.jpeg"
                        alt="User"
                        width={36}
                        height={36}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Main Input */}
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasMessages
                  ? "Type your message..."
                  : "Schedule a dentist appointment near me..."
              }
              className={styles.mainInput}
              disabled={actionLoading}
              autoFocus
            />
            <button
              type={input.trim() ? "submit" : "button"}
              onClick={!input.trim() ? (e) => { e.preventDefault(); startVoiceMode(); } : undefined}
              className={`${styles.submitButton} ${
                input.trim() && !actionLoading ? styles.submitButtonEnabled : ""
              } ${!input.trim() && !actionLoading ? styles.voiceButtonEnabled : ""}`}
              disabled={actionLoading}
              aria-label={input.trim() ? "Submit" : "Start voice input"}
            >
              {actionLoading ? (
                <span className={styles.spinner}>⏳</span>
              ) : input.trim() ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 10H16M16 10L11 5M16 10L11 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="6"
                    width="2"
                    height="8"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="6"
                    y="5"
                    width="2"
                    height="10"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="9"
                    y="4"
                    width="2"
                    height="12"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="12"
                    y="5"
                    width="2"
                    height="10"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="15"
                    y="6"
                    width="2"
                    height="8"
                    rx="1"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </form>

          {/* Quick Actions - only show when no messages */}
          {!hasMessages && (
            <div className={styles.quickActions}>
              <p className={styles.quickActionsLabel}>
                Not sure where to start? Try one of these:
              </p>
              <div className={styles.quickActionGrid}>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Find me a dentist near SoMa after 5pm next week"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🦷</span>
                  <span className={styles.quickActionText}>
                    Schedule Dentist
                  </span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Cancel my Calm subscription before it renews"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>❌</span>
                  <span className={styles.quickActionText}>
                    Cancel Subscription
                  </span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Dispute that $250 charge from Gas Station XYZ"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💳</span>
                  <span className={styles.quickActionText}>Dispute Charge</span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Compare Sony WH-1000XM5 prices on Amazon, Best Buy, and Target"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💰</span>
                  <span className={styles.quickActionText}>Compare Prices</span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Research iPhone 15 Pro specifications and reviews"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🔍</span>
                  <span className={styles.quickActionText}>
                    Research Product
                  </span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Book a haircut appointment for this Saturday morning"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💇</span>
                  <span className={styles.quickActionText}>Book Haircut</span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Find the best Italian restaurant for dinner tonight"
                    )
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🍝</span>
                  <span className={styles.quickActionText}>
                    Find Restaurant
                  </span>
                </button>
                <button
                  onClick={() =>
                    handleQuickAction("Cancel my Netflix subscription")
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>📺</span>
                  <span className={styles.quickActionText}>Cancel Netflix</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Info */}
          {!hasMessages && (
            <div className={styles.footerInfo}>
              <p>
                Built with AGI, OpenAI GPT-4 · Autonomous Agent Infrastructure
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Voice Mode Overlay */}
      {isVoiceMode && (
        <div className={styles.voiceModeOverlay}>
          <div className={styles.voiceModeContainer}>
            <div className={styles.voiceModeHeader}>
              <h2>Voice Mode</h2>
              <button
                onClick={stopVoiceMode}
                className={styles.voiceModeClose}
                aria-label="Close voice mode"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className={styles.voiceModeContent}>
              <div
                className={`${styles.voiceIndicator} ${
                  isListening ? styles.voiceIndicatorListening : ""
                } ${isSpeaking ? styles.voiceIndicatorSpeaking : ""}`}
              >
                <div className={styles.voiceIndicatorInner}>
                  {isListening && (
                    <div className={styles.voiceWave}>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className={styles.voiceWave}>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}
                  {!isListening && !isSpeaking && (
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="3"
                        y="6"
                        width="2"
                        height="8"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="6"
                        y="5"
                        width="2"
                        height="10"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="9"
                        y="4"
                        width="2"
                        height="12"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="12"
                        y="5"
                        width="2"
                        height="10"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="15"
                        y="6"
                        width="2"
                        height="8"
                        rx="1"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <div className={styles.voiceStatus}>
                {isListening && (
                  <p className={styles.voiceStatusText}>
                    {transcript || "Listening..."}
                  </p>
                )}
                {isSpeaking && (
                  <p className={styles.voiceStatusText}>Speaking...</p>
                )}
                {!isListening && !isSpeaking && (
                  <p className={styles.voiceStatusText}>Ready to listen</p>
                )}
              </div>

              {actionLoading && (
                <div className={styles.voiceLoading}>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
