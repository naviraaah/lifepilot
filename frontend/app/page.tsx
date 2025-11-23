"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendAgentRequest } from "../lib/api";
import styles from "./page.module.css";

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          <Link href="/timeline" className={styles.navLink}>
            Timeline
          </Link>
          <Link href="/settings" className={styles.navLink}>
            Settings
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Greeting - only show when no messages */}
          {!hasMessages && (
            <div className={styles.greeting}>
              <h1>What can I help you with?</h1>
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
                    <div className={styles.messageAvatar}>🤖</div>
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
                    <div className={styles.userAvatar}>👤</div>
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
              type="submit"
              className={`${styles.submitButton} ${
                input.trim() && !actionLoading ? styles.submitButtonEnabled : ""
              }`}
              disabled={actionLoading || !input.trim()}
              aria-label="Submit"
            >
              {actionLoading ? (
                <span className={styles.spinner}>⏳</span>
              ) : (
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
    </div>
  );
}
