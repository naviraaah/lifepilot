'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createActionPlan } from '../lib/api';
import styles from './page.module.css';

export default function Home() {
  const [input, setInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const userId = 'demo_user_123';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setActionLoading(true);
      
      // Determine action type from input
      let actionType = 'general';
      if (input.toLowerCase().includes('dentist') || input.toLowerCase().includes('appointment')) {
        actionType = 'schedule_dentist_appointment';
      } else if (input.toLowerCase().includes('cancel') && input.toLowerCase().includes('subscription')) {
        actionType = 'cancel_subscription';
      } else if (input.toLowerCase().includes('dispute') || input.toLowerCase().includes('charge')) {
        actionType = 'dispute_credit_card_charge';
      }

      const plan = await createActionPlan(userId, actionType, input);
      
      // Redirect to confirmation page
      window.location.href = `/confirm?actionId=${plan.actionId}`;
    } catch (error) {
      console.error('Error creating action:', error);
      alert('Failed to create action. Please try again.');
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

          {/* Quick Actions */}
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
                onClick={() => handleQuickAction('Book a haircut appointment for this Saturday morning')}
                className={styles.quickActionPill}
                disabled={actionLoading}
              >
                <span className={styles.quickActionIcon}>💇</span>
                <span className={styles.quickActionText}>Book Haircut</span>
              </button>
              <button 
                onClick={() => handleQuickAction('Cancel my gym membership')}
                className={styles.quickActionPill}
                disabled={actionLoading}
              >
                <span className={styles.quickActionIcon}>🏋️</span>
                <span className={styles.quickActionText}>Cancel Gym</span>
              </button>
              <button 
                onClick={() => handleQuickAction('Schedule annual car maintenance')}
                className={styles.quickActionPill}
                disabled={actionLoading}
              >
                <span className={styles.quickActionIcon}>🚗</span>
                <span className={styles.quickActionText}>Car Maintenance</span>
              </button>
              <button 
                onClick={() => handleQuickAction('Find a plumber for a leaky faucet')}
                className={styles.quickActionPill}
                disabled={actionLoading}
              >
                <span className={styles.quickActionIcon}>🔧</span>
                <span className={styles.quickActionText}>Find Plumber</span>
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

          {/* Footer Info */}
          <div className={styles.footerInfo}>
            <p>Built with OpenAI GPT-4 · Autonomous Agent Infrastructure</p>
          </div>
        </div>
      </main>
    </div>
  );
}
