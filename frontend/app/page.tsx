'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sendAgentRequest, AgentResponse } from '../lib/api';
import styles from './page.module.css';

export default function Home() {
  const [input, setInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = 'demo_user_123';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      setResponse(null);
      
      // Call unified agent API - it will automatically route to the right agent
      const result = await sendAgentRequest(input, userId);
      setResponse(result);
    } catch (err: any) {
      console.error('Error calling agent:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickAction = async (prompt: string) => {
    setInput(prompt);
    // Auto-submit after a brief delay to show the text
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

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
          <Link href="/timeline" className={styles.navLink}>Timeline</Link>
          <Link href="/settings" className={styles.navLink}>Settings</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Greeting */}
          <div className={styles.greeting}>
            <h1>What can I help you with?</h1>
            <p>Tell me what you need, and I'll handle it for you</p>
          </div>

          {/* Main Input */}
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Schedule a dentist appointment near me..."
              className={styles.mainInput}
              disabled={actionLoading}
              autoFocus
            />
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={actionLoading || !input.trim()}
              aria-label="Submit"
            >
              {actionLoading ? (
                <span className={styles.spinner}>⏳</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className={styles.errorBox}>
              <h3>❌ Error</h3>
              <p>{error}</p>
              <button onClick={() => { setError(null); setResponse(null); }} className={styles.clearButton}>
                Clear
              </button>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className={styles.responseBox}>
              <div className={styles.responseHeader}>
                <h3>✅ Agent Response</h3>
                <button onClick={() => setResponse(null)} className={styles.clearButton}>
                  ✕
                </button>
              </div>
              
              {/* Agent Routing Info */}
              <div className={styles.agentInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Routed Agent:</span>
                  <span className={styles.infoValue}>{response.routedAgent || response.action || 'N/A'}</span>
                </div>
                {response.intent && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Intent:</span>
                    <span className={styles.infoValue}>{response.intent}</span>
                  </div>
                )}
                {response.confidence !== undefined && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Confidence:</span>
                    <span className={styles.infoValue}>{(response.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                {response.status && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={styles.infoValue}>{response.status}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {response.summary && (
                <div className={styles.summaryBox}>
                  <h4>Summary</h4>
                  <p>{response.summary}</p>
                </div>
              )}

              {/* Details */}
              {response.details && (
                <div className={styles.detailsBox}>
                  <h4>Details</h4>
                  <pre className={styles.detailsContent}>
                    {typeof response.details === 'string' 
                      ? response.details 
                      : JSON.stringify(response.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Additional Info */}
              {(response.product || response.productName || response.retailers) && (
                <div className={styles.additionalInfo}>
                  {response.product && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Product:</span>
                      <span className={styles.infoValue}>{response.product}</span>
                    </div>
                  )}
                  {response.productName && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Product:</span>
                      <span className={styles.infoValue}>{response.productName}</span>
                    </div>
                  )}
                  {response.retailers && response.retailers.length > 0 && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Retailers:</span>
                      <span className={styles.infoValue}>{response.retailers.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {!response && !error && (
            <div className={styles.quickActions}>
              <p className={styles.quickActionsLabel}>Not sure where to start? Try one of these:</p>
              <div className={styles.quickActionGrid}>
                <button 
                  onClick={() => handleQuickAction('Find me a dentist near SoMa after 5pm next week')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🦷</span>
                  <span className={styles.quickActionText}>Schedule Dentist</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Cancel my Calm subscription before it renews')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>❌</span>
                  <span className={styles.quickActionText}>Cancel Subscription</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Dispute that $250 charge from Gas Station XYZ')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💳</span>
                  <span className={styles.quickActionText}>Dispute Charge</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Compare Sony WH-1000XM5 prices on Amazon, Best Buy, and Target')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💰</span>
                  <span className={styles.quickActionText}>Compare Prices</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Research iPhone 15 Pro specifications and reviews')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🔍</span>
                  <span className={styles.quickActionText}>Research Product</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Book a haircut appointment for this Saturday morning')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>💇</span>
                  <span className={styles.quickActionText}>Book Haircut</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Find the best Italian restaurant for dinner tonight')}
                  className={styles.quickActionPill}
                  disabled={actionLoading}
                >
                  <span className={styles.quickActionIcon}>🍝</span>
                  <span className={styles.quickActionText}>Find Restaurant</span>
                </button>
                <button 
                  onClick={() => handleQuickAction('Cancel my Netflix subscription')}
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
          <div className={styles.footerInfo}>
            <p>Built with AGI, OpenAI GPT-5.1 · Autonomous Agent Infrastructure</p>
          </div>
        </div>
      </main>
    </div>
  );
}
