"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { sendAgentRequest } from "../lib/api";
import styles from "./page.module.css";

/**
 * Converts markdown text to HTML
 * Handles: bold (**text**), lists (- item), nested lists, line breaks, paragraphs
 */
function markdownToHtml(text: string): string {
  if (!text) return "";
  
  // First, convert bold text (**text**) - do this before processing lines
  // to preserve bold formatting in lists
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Split by line breaks
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let listStack: number[] = []; // Track indentation levels for nested lists
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Calculate indentation (count leading spaces before the dash)
    const indentMatch = line.match(/^(\s*)- /);
    const indentLevel = indentMatch ? indentMatch[1].length : -1;
    
    // Check if line is a list item
    if (indentMatch && trimmedLine.length > 2) {
      // Extract list content (everything after "- ")
      const listContent = trimmedLine.substring(2).trim();
      
      // Close lists if we're at a lower or same indentation level (going back up the hierarchy)
      while (listStack.length > 0 && listStack[listStack.length - 1] >= indentLevel) {
        processedLines.push('</ul>');
        listStack.pop();
      }
      
      // Open new list if we're going deeper or starting a new list
      if (listStack.length === 0 || listStack[listStack.length - 1] < indentLevel) {
        processedLines.push('<ul>');
        listStack.push(indentLevel);
      }
      
      // Add the list item
      processedLines.push(`<li>${listContent}</li>`);
    } else if (trimmedLine === '') {
      // Empty line - close all lists
      while (listStack.length > 0) {
        processedLines.push('</ul>');
        listStack.pop();
      }
      processedLines.push('<br>');
    } else {
      // Regular text line - close all lists first
      while (listStack.length > 0) {
        processedLines.push('</ul>');
        listStack.pop();
      }
      processedLines.push(`<p>${trimmedLine}</p>`);
    }
  }
  
  // Close any remaining open lists
  while (listStack.length > 0) {
    processedLines.push('</ul>');
    listStack.pop();
  }
  
  return processedLines.join('');
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
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

// Placeholder suggestions that loop in typewriter effect
const PLACEHOLDER_SUGGESTIONS = [
  "Schedule a dentist appointment near me...",
  "Compare Sony WH-1000XM5 prices on Amazon, Best Buy, and Target",
  "Research iPhone 15 Pro specifications and reviews"
];

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
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = "demo_user_123";

  // Voice mode state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [micPermissionRequested, setMicPermissionRequested] = useState(false);
  const [usedVoiceInput, setUsedVoiceInput] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const finalTranscriptRef = useRef<string>("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typewriter effect for placeholder
  useEffect(() => {
    const hasMessages = messages.length > 0;
    
    if (hasMessages || actionLoading) {
      setPlaceholderText("Type your message...");
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const currentSuggestion = PLACEHOLDER_SUGGESTIONS[placeholderIndex];
    const typingSpeed = 50; // milliseconds per character
    const deletingSpeed = 30; // milliseconds per character
    const pauseAfterComplete = 2000; // pause after completing a suggestion
    const pauseAfterDelete = 500; // pause before starting next suggestion

    if (isTyping) {
      // Typing phase
      if (placeholderText.length < currentSuggestion.length) {
        timeoutId = setTimeout(() => {
          setPlaceholderText(currentSuggestion.slice(0, placeholderText.length + 1));
        }, typingSpeed);
      } else {
        // Finished typing, pause then start deleting
        timeoutId = setTimeout(() => {
          setIsTyping(false);
        }, pauseAfterComplete);
      }
    } else {
      // Deleting phase
      if (placeholderText.length > 0) {
        timeoutId = setTimeout(() => {
          setPlaceholderText(placeholderText.slice(0, -1));
        }, deletingSpeed);
      } else {
        // Finished deleting, move to next suggestion
        timeoutId = setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length);
          setIsTyping(true);
        }, pauseAfterDelete);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [placeholderText, placeholderIndex, isTyping, messages.length, actionLoading]);

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
      // Prepare conversation history for context
      const conversationHistory = messages
        .filter(msg => !msg.isLoading)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      const result: any = await sendAgentRequest(text, userId, undefined, undefined, conversationHistory);
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
        utterance.rate = 1.1; // Slightly faster for more natural, ChatGPT-like feel
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          // Resume listening after speaking - faster transition for better flow
          if (isVoiceMode) {
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error("Error restarting recognition:", error);
                }
              }
            }, 300); // Faster transition for more responsive feel
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
            }, 300); // Faster transition
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
        utterance.rate = 1.1; // Faster for more natural feel
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
            }, 300); // Faster transition
          }
        };

        synthesisRef.current.speak(utterance);
      }
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, userId, isVoiceMode, isSpeaking, isListening]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermissionGranted(true);
        setMicPermissionRequested(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Microphone permission denied:", error);
      setMicPermissionGranted(false);
      setMicPermissionRequested(true);
      alert("Microphone permission is required for voice input. Please enable it in your browser settings.");
      return false;
    }
  }, []);

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
            // Update input field with final transcript
            setInput(finalTranscriptRef.current);
          } else {
            setTranscript(interimTranscript);
            // Update input field with interim transcript
            setInput(interimTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          
          if (event.error === "not-allowed" || event.error === "denied") {
            setMicPermissionGranted(false);
            alert("Microphone access was denied. Please enable it in your browser settings.");
          } else if (event.error === "no-speech") {
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
          // If we have a final transcript, handle it
          const finalText = finalTranscriptRef.current;
          if (finalText) {
            if (isVoiceMode) {
              // In voice mode, process and speak response
              finalTranscriptRef.current = "";
              setTranscript("");
              handleVoiceInput(finalText);
            } else {
              // In microphone button mode, just update input and stop
              setInput(finalText);
              setUsedVoiceInput(true); // Mark that voice input was used
              finalTranscriptRef.current = "";
              setTranscript("");
            }
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

  const startVoiceMode = useCallback(async () => {
    // Request permission if not already granted
    if (!micPermissionGranted && !micPermissionRequested) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        return;
      }
    }

    setIsVoiceMode(true);
    setTranscript("");
    finalTranscriptRef.current = "";
    setInput("");
    
    // Start listening after a brief delay
    setTimeout(() => {
      if (synthesisRef.current) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance("Hey, I'm listening. What can I help you with?");
        utterance.rate = 1.1; // Slightly faster for more natural feel
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
          }, 200); // Faster transition
        };

        synthesisRef.current.speak(utterance);
      }
    }, 200); // Faster start
  }, [micPermissionGranted, micPermissionRequested, requestMicrophonePermission]);

  // Toggle listening (for microphone button)
  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      setIsVoiceMode(false);
    } else {
      // Request permission if not already granted
      if (!micPermissionGranted && !micPermissionRequested) {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          return;
        }
      }

      if (recognitionRef.current && !isSpeaking) {
        try {
          setTranscript("");
          finalTranscriptRef.current = "";
          setInput("");
          recognitionRef.current.start();
        } catch (error) {
          console.error("Error starting recognition:", error);
        }
      }
    }
  }, [isListening, isSpeaking, micPermissionGranted, micPermissionRequested, requestMicrophonePermission, stopListening]);

  // Handle attachment button click
  const handleAttachmentClick = useCallback(() => {
    setShowAddMenu((prev) => !prev);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(`.${styles.attachButton}`)
      ) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAddMenu]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setAttachments((prev) => [...prev, ...fileArray]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
      // Prepare conversation history for context
      const conversationHistory = messages
        .filter(msg => !msg.isLoading)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // Call unified agent API - it will automatically route to the right agent
      const result: any = await sendAgentRequest(currentInput, userId, undefined, undefined, conversationHistory);

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
        const responseText =
          result.summary ||
          result.details?.response ||
          "I received your message.";
        
        // Remove loading message and add AI response
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
                }
              : msg
          )
        );

        // Speak the response if voice input was used
        if (usedVoiceInput && synthesisRef.current && !isSpeaking) {
          setIsSpeaking(true);
          const utterance = new SpeechSynthesisUtterance(responseText);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => {
            setIsSpeaking(false);
            setUsedVoiceInput(false); // Reset after speaking
          };

          utterance.onerror = () => {
            setIsSpeaking(false);
            setUsedVoiceInput(false);
          };

          synthesisRef.current.speak(utterance);
        } else {
          setUsedVoiceInput(false); // Reset if not speaking
        }
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

      // Speak error message if voice input was used
      if (usedVoiceInput && synthesisRef.current && !isSpeaking) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(errorMessage);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setIsSpeaking(false);
          setUsedVoiceInput(false);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          setUsedVoiceInput(false);
        };

        synthesisRef.current.speak(utterance);
      } else {
        setUsedVoiceInput(false);
      }
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
            src="/full name logo colored.png"
            alt="LifePilot" 
            width={180}
            height={40}
            className={styles.logoImage}
            priority
          />
        </Link>
        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`} aria-label="Home">
            <Image
              src="/LOGO black.png"
              alt="Home"
              width={24}
              height={24}
              className={styles.navIcon}
              style={{ objectFit: 'contain' }}
            />
            <span className={styles.navLabel}>Home</span>
          </Link>
          <Link href="/timeline" className={`${styles.navLink} ${pathname === '/timeline' ? styles.navLinkActive : ''}`} aria-label="Overview">
            <svg
              width="24"
              height="24"
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
            <span className={styles.navLabel}>Overview</span>
          </Link>
          <Link href="/settings" className={`${styles.navLink} ${pathname === '/settings' ? styles.navLinkActive : ''}`} aria-label="Settings">
            <Image
              src="/Liam Persona.jpeg"
              alt="Settings"
              width={24}
              height={24}
              className={styles.navIcon}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
            <span className={styles.navLabel}>Settings</span>
          </Link>
        </nav>
      </header>

      {/* Bottom Navbar - Mobile Only */}
      <nav className={styles.bottomNav}>
        <Link href="/" className={`${styles.bottomNavLink} ${pathname === '/' ? styles.bottomNavLinkActive : ''}`} aria-label="Home">
          <Image
            src="/LOGO black.png"
            alt="Home"
            width={24}
            height={24}
            className={styles.bottomNavIcon}
            style={{ objectFit: 'contain' }}
          />
          <span className={styles.bottomNavLabel}>Home</span>
        </Link>
        <Link href="/timeline" className={`${styles.bottomNavLink} ${pathname === '/timeline' ? styles.bottomNavLinkActive : ''}`} aria-label="Overview">
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.bottomNavIcon}
          >
            <path
              d="M3 4H17M3 8H17M3 12H13M3 16H9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.bottomNavLabel}>Overview</span>
        </Link>
        <Link href="/settings" className={`${styles.bottomNavLink} ${pathname === '/settings' ? styles.bottomNavLinkActive : ''}`} aria-label="Settings">
          <Image
            src="/Liam Persona.jpeg"
            alt="Settings"
            width={24}
            height={24}
            className={styles.bottomNavProfileIcon}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
          <span className={styles.bottomNavLabel}>Settings</span>
        </Link>
      </nav>

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
                        <div dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }} />
                      </div>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }} />
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
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className={styles.fileInput}
              aria-label="File input"
            />
            <button
              type="button"
              onClick={handleAttachmentClick}
              className={styles.attachButton}
              disabled={actionLoading}
              aria-label="Add attachment"
              title="Add attachment"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 4V16M4 10H16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showAddMenu && (
              <div ref={addMenuRef} className={styles.addMenu}>
                <div className={styles.addMenuPrompts}>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickAction("Monitor and compare prices");
                      setShowAddMenu(false);
                    }}
                    className={styles.addMenuPrompt}
                    disabled={actionLoading}
                  >
                    <span className={styles.addMenuPromptText}>Monitoring and comparing prices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickAction("Book an appointment");
                      setShowAddMenu(false);
                    }}
                    className={styles.addMenuPrompt}
                    disabled={actionLoading}
                  >
                    <span className={styles.addMenuPromptText}>Booking appointments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickAction("Book a flight");
                      setShowAddMenu(false);
                    }}
                    className={styles.addMenuPrompt}
                    disabled={actionLoading}
                  >
                    <span className={styles.addMenuPromptText}>Booking a flight</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickAction("Teach my friend to click a picture");
                      setShowAddMenu(false);
                    }}
                    className={styles.addMenuPrompt}
                    disabled={actionLoading}
                  >
                    <span className={styles.addMenuPromptText}>Teach my friend to click a picture</span>
                  </button>
                </div>
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Stop listening if user types in voice mode
                if (e.target.value && isListening && recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch (error) {
                    console.error("Error stopping recognition:", error);
                  }
                }
                // Reset voice input flag if user types manually
                if (e.target.value && !isListening) {
                  setUsedVoiceInput(false);
                }
              }}
              placeholder={placeholderText || "Schedule a dentist appointment near me..."}
              className={styles.mainInput}
              disabled={actionLoading}
              autoFocus
            />
            <button 
              type="button"
              onClick={toggleListening}
              className={`${styles.micButton} ${
                isListening ? styles.micButtonActive : ""
              }`}
              disabled={actionLoading || isSpeaking}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="8"
                    width="14"
                    height="4"
                    rx="2"
                    fill="currentColor"
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
                  <path
                    d="M10 1C8.34 1 7 2.34 7 4V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V4C13 2.34 11.66 1 10 1Z"
                    fill="currentColor"
                  />
                  <path
                    d="M15 9C15 12.31 12.31 15 9 15M9 15V18M9 15H6M9 15H12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              type={input.trim() || isVoiceMode ? "submit" : "button"}
              onClick={!input.trim() && !isVoiceMode && !actionLoading ? startVoiceMode : undefined}
              className={`${styles.submitButton} ${
                (input.trim() || isVoiceMode) && !actionLoading ? styles.submitButtonEnabled : ""
              }`}
              disabled={actionLoading}
              aria-label={input.trim() || isVoiceMode ? "Submit" : "Start Voice AI mode"}
            >
              {input.trim() || isVoiceMode ? (
                <Image
                  src="/LOGO White.png"
                  alt="Submit"
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Sound wave / Audio equalizer icon - 11 bars with varying heights */}
                  <rect x="1" y="12" width="1.2" height="4" rx="0.6" fill="currentColor"/>
                  <rect x="2.8" y="10" width="1.2" height="8" rx="0.6" fill="currentColor"/>
                  <rect x="4.6" y="13" width="1.2" height="2" rx="0.6" fill="currentColor"/>
                  <rect x="6.4" y="6" width="1.2" height="14" rx="0.6" fill="currentColor"/>
                  <rect x="8.2" y="9" width="1.2" height="8" rx="0.6" fill="currentColor"/>
                  <rect x="10" y="4" width="1.2" height="16" rx="0.6" fill="currentColor"/>
                  <rect x="11.8" y="9" width="1.2" height="8" rx="0.6" fill="currentColor"/>
                  <rect x="13.6" y="6" width="1.2" height="14" rx="0.6" fill="currentColor"/>
                  <rect x="15.4" y="13" width="1.2" height="2" rx="0.6" fill="currentColor"/>
                  <rect x="17.2" y="10" width="1.2" height="8" rx="0.6" fill="currentColor"/>
                  <rect x="18.8" y="12" width="1.2" height="4" rx="0.6" fill="currentColor"/>
                </svg>
              )}
            </button>
            {attachments.length > 0 && (
              <div className={styles.attachmentsList}>
                {attachments.map((file, index) => (
                  <div key={index} className={styles.attachmentItem}>
                    <span className={styles.attachmentName}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className={styles.attachmentRemove}
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                <button
                  onClick={() =>
                    handleQuickAction("Add DCS to my account")
                  }
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>➕</span>
                  <span className={styles.quickActionText}>Add DCS</span>
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
