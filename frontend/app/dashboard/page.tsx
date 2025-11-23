'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getUser, 
  getUserActions, 
  getProactiveSuggestions, 
  getUpcomingReminders,
  getFeedbackSummary,
  createActionPlan 
} from '../../lib/api';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const [userId, setUserId] = useState('demo_user_123');
  const [user, setUser] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [userId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data
      const [userResult, suggestionsResult, remindersResult, actionsResult, summaryResult] = await Promise.allSettled([
        getUser(userId).catch(() => null),
        getProactiveSuggestions(userId).catch(() => ({ suggestions: [] })),
        getUpcomingReminders(userId, 30).catch(() => ({ reminders: [] })),
        getUserActions(userId).catch(() => ({ actions: [] })),
        getFeedbackSummary(userId).catch(() => null)
      ]);

      if (userResult.status === 'fulfilled' && userResult.value) {
        setUser(userResult.value);
      }
      
      if (suggestionsResult.status === 'fulfilled') {
        setSuggestions(suggestionsResult.value.suggestions || []);
      }
      
      if (remindersResult.status === 'fulfilled') {
        setReminders(remindersResult.value.reminders || []);
      }
      
      if (actionsResult.status === 'fulfilled') {
        setRecentActions((actionsResult.value.actions || []).slice(0, 5));
      }
      
      if (summaryResult.status === 'fulfilled') {
        setFeedbackSummary(summaryResult.value);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (e: React.FormEvent) => {
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

  const getTrustLevelColor = (level: string) => {
    switch (level) {
      case 'autonomous': return '#10b981';
      case 'trusted': return '#3b82f6';
      case 'training': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTrustLevelLabel = (level: string) => {
    switch (level) {
      case 'autonomous': return '🤖 Autonomous';
      case 'trusted': return '✅ Trusted';
      case 'training': return '📚 Training';
      default: return '👋 New';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>✈️ LifePilot</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'Welcome'}</span>
            <span 
              className={styles.trustBadge}
              style={{ backgroundColor: getTrustLevelColor(user?.trustLevel || 'new') }}
            >
              {getTrustLevelLabel(user?.trustLevel || 'new')}
            </span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Quick Action Input */}
        <section className={styles.quickAction}>
          <h2>What can I help you with today?</h2>
          <form onSubmit={handleQuickAction}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: 'Schedule a dentist for next week' or 'Cancel my gym membership'"
              className={styles.input}
              disabled={actionLoading}
            />
            <button 
              type="submit" 
              className={styles.button}
              disabled={actionLoading || !input.trim()}
            >
              {actionLoading ? '...' : 'Go →'}
            </button>
          </form>
        </section>

        {/* Trust & Performance Summary */}
        {feedbackSummary && feedbackSummary.totalActions > 0 && (
          <section className={styles.trustSection}>
            <h3>🎯 Our Performance Together</h3>
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{feedbackSummary.successRate}</div>
                <div className={styles.statLabel}>Success Rate</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{feedbackSummary.totalActions}</div>
                <div className={styles.statLabel}>Actions Completed</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>⭐ {feedbackSummary.averageRating}</div>
                <div className={styles.statLabel}>Avg Rating</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{user?.preferences?.trainingRounds || 0}</div>
                <div className={styles.statLabel}>Training Rounds</div>
              </div>
            </div>
            <p className={styles.trustMessage}>{feedbackSummary.message}</p>
          </section>
        )}

        {/* Proactive Suggestions */}
        {suggestions.length > 0 && (
          <section className={styles.suggestions}>
            <h3>💡 Proactive Suggestions</h3>
            <p className={styles.sectionSubtext}>Based on your patterns, I noticed these upcoming tasks:</p>
            <div className={styles.suggestionList}>
              {suggestions.map((suggestion: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`${styles.suggestionCard} ${suggestion.urgency === 'high' ? styles.urgent : ''}`}
                >
                  <div className={styles.suggestionHeader}>
                    <span className={styles.suggestionTitle}>{suggestion.title}</span>
                    <span className={styles.suggestionDays}>
                      {suggestion.daysUntil === 0 ? 'Today' : `${suggestion.daysUntil}d`}
                    </span>
                  </div>
                  <p className={styles.suggestionMessage}>{suggestion.message}</p>
                  <button className={styles.suggestionButton}>
                    {suggestion.actionSuggested.label}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Reminders */}
        {reminders.length > 0 && (
          <section className={styles.reminders}>
            <h3>📅 Upcoming Reminders</h3>
            <div className={styles.reminderList}>
              {reminders.slice(0, 5).map((reminder: any) => (
                <div key={reminder.id} className={styles.reminderCard}>
                  <div className={styles.reminderIcon}>⏰</div>
                  <div className={styles.reminderContent}>
                    <h4>{reminder.title}</h4>
                    <p>{reminder.description}</p>
                    <span className={styles.reminderDate}>
                      In {reminder.daysUntil} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/reminders" className={styles.viewAll}>
              View all reminders →
            </Link>
          </section>
        )}

        {/* Recent Actions */}
        {recentActions.length > 0 && (
          <section className={styles.recentActions}>
            <h3>📜 Recent Actions</h3>
            <div className={styles.actionList}>
              {recentActions.map((action: any) => (
                <Link 
                  key={action.id} 
                  href={`/actions/${action.id}`}
                  className={styles.actionCard}
                >
                  <div className={styles.actionIcon}>
                    {action.type === 'schedule_dentist_appointment' && '🦷'}
                    {action.type === 'cancel_subscription' && '❌'}
                    {action.type === 'dispute_credit_card_charge' && '💳'}
                  </div>
                  <div className={styles.actionContent}>
                    <h4>{action.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h4>
                    <p>{action.input.substring(0, 60)}...</p>
                    <div className={styles.actionMeta}>
                      <span className={`${styles.status} ${styles[action.status]}`}>
                        {action.status.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.date}>
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/timeline" className={styles.viewAll}>
              View full timeline →
            </Link>
          </section>
        )}

        {/* Quick Links */}
        <section className={styles.quickLinks}>
          <Link href="/timeline" className={styles.quickLink}>
            <span>📜</span>
            <span>Action Timeline</span>
          </Link>
          <Link href="/reminders" className={styles.quickLink}>
            <span>📅</span>
            <span>Reminders</span>
          </Link>
          <Link href="/settings" className={styles.quickLink}>
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
          <Link href="/feedback" className={styles.quickLink}>
            <span>⭐</span>
            <span>Give Feedback</span>
          </Link>
        </section>
      </main>
    </div>
  );
}

