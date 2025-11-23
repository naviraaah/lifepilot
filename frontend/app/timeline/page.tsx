'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getUserActions } from '../../lib/api';
import styles from './timeline.module.css';

export default function Timeline() {
  const router = useRouter();
  const userId = 'demo_user_123'; // In production, get from auth

  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const result = await getUserActions(userId);
      setActions(result.actions || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    if (filter === 'all') return true;
    return action.status === filter || (filter === 'pending' && action.status === 'pending_approval');
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'pending_approval': return '⏳';
      case 'executing': return '⚙️';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '📋';
    }
  };

  const getActionIcon = (type: string) => {
    if (type.includes('dentist')) return '🦷';
    if (type.includes('subscription')) return '❌';
    if (type.includes('dispute')) return '💳';
    return '📝';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
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
        <main className={styles.main}>
          <div className={styles.loading}>Loading your timeline...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1>Timeline</h1>
          <p className={styles.pageSubtitle}>View your action history and track progress</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterButtons}>
            <button
              className={filter === 'all' ? styles.active : ''}
              onClick={() => setFilter('all')}
            >
              All ({actions.length})
            </button>
            <button
              className={filter === 'completed' ? styles.active : ''}
              onClick={() => setFilter('completed')}
            >
              Completed ({actions.filter(a => a.status === 'completed').length})
            </button>
            <button
              className={filter === 'pending' ? styles.active : ''}
              onClick={() => setFilter('pending')}
            >
              Pending ({actions.filter(a => a.status === 'pending_approval').length})
            </button>
            <button
              className={filter === 'failed' ? styles.active : ''}
              onClick={() => setFilter('failed')}
            >
              Failed ({actions.filter(a => a.status === 'failed').length})
            </button>
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {actions.filter(a => a.status === 'completed').length}
              </span>
              <span className={styles.statLabel}>Completed</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {actions.length > 0 
                  ? Math.round((actions.filter(a => a.status === 'completed').length / actions.length) * 100)
                  : 0}%
              </span>
              <span className={styles.statLabel}>Success Rate</span>
            </div>
          </div>
        </div>

        {filteredActions.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌟</div>
            <h3>No actions yet</h3>
            <p>Start by asking me to help with something on the dashboard!</p>
            <button onClick={() => router.push('/')} className={styles.emptyButton}>
              Go Home
            </button>
          </div>
        ) : (
          <div className={styles.timeline}>
            {filteredActions.map((action, idx) => (
              <div key={action.id} className={styles.timelineItem}>
                <div className={styles.timelineMarker}>
                  <div className={styles.timelineDot}></div>
                  {idx < filteredActions.length - 1 && <div className={styles.timelineLine}></div>}
                </div>
                
                <div className={styles.actionCard}>
                  <div className={styles.actionHeader}>
                    <div className={styles.actionIcons}>
                      <span className={styles.actionTypeIcon}>{getActionIcon(action.type)}</span>
                      <span className={styles.statusIcon}>{getStatusIcon(action.status)}</span>
                    </div>
                    <span className={styles.actionDate}>{formatDate(action.createdAt)}</span>
                  </div>

                  <h3 className={styles.actionTitle}>
                    {action.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </h3>

                  <p className={styles.actionInput}>{action.input}</p>

                  <div className={styles.actionFooter}>
                    <span className={`${styles.statusBadge} ${styles[action.status]}`}>
                      {action.status.replace(/_/g, ' ')}
                    </span>

                    <div className={styles.actionButtons}>
                      {action.status === 'pending_approval' && (
                        <button
                          onClick={() => router.push(`/confirm?actionId=${action.id}`)}
                          className={styles.reviewButton}
                        >
                          Review & Approve
                        </button>
                      )}
                      {action.status === 'completed' && !action.feedback && (
                        <button
                          onClick={() => router.push(`/feedback?actionId=${action.id}`)}
                          className={styles.feedbackButton}
                        >
                          Give Feedback
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/actions/${action.id}`)}
                        className={styles.detailsButton}
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {action.feedback && (
                    <div className={styles.feedbackSummary}>
                      <span className={styles.feedbackRating}>
                        {'⭐'.repeat(action.feedback.rating)}
                      </span>
                      {action.feedback.comment && (
                        <p className={styles.feedbackComment}>"{action.feedback.comment}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

