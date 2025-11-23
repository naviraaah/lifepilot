'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getUserActions, getActionStatus, getUser } from '../../lib/api';
import styles from './timeline.module.css';

export default function Timeline() {
  const router = useRouter();
  const pathname = usePathname();
  const userId = 'demo_user_123'; // In production, get from auth

  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadTimeline();
    loadUser();
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

  const loadUser = async () => {
    try {
      const userData = await getUser(userId);
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      // Set default user data if API fails
      setUser({
        id: userId,
        preferences: {
          trainingRounds: 8
        },
        trustLevel: 'training'
      });
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

  const handleViewDetails = async (actionId: string) => {
    setSelectedActionId(actionId);
    setActionLoading(true);
    try {
      const data = await getActionStatus(actionId, userId);
      setSelectedAction(data);
    } catch (error) {
      console.error('Error loading action details:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedActionId(null);
    setSelectedAction(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending_approval': return '#F59E0B';
      case 'executing': return '#3B82F6';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTrustColor = (level: string) => {
    switch (level) {
      case 'autonomous': return '#10b981';
      case 'trusted': return '#3b82f6';
      case 'training': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTrustLabel = (level: string) => {
    switch (level) {
      case 'autonomous': 
        return (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Autonomous
          </>
        );
      case 'trusted': 
        return (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Trusted
          </>
        );
      case 'training': 
        return (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Training
          </>
        );
      default: 
        return (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            New
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
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
          <Link href="/timeline" className={`${styles.navLink} ${pathname === '/timeline' ? styles.navLinkActive : ''}`} aria-label="Timeline">
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
            <span className={styles.navLabel}>Timeline</span>
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
        <Link href="/timeline" className={`${styles.bottomNavLink} ${pathname === '/timeline' ? styles.bottomNavLinkActive : ''}`} aria-label="Timeline">
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
          <span className={styles.bottomNavLabel}>Timeline</span>
        </Link>
        <Link href="/settings" className={`${styles.bottomNavLink} ${pathname === '/settings' ? styles.bottomNavLinkActive : ''}`} aria-label="Settings">
          <Image
            src="/Liam Persona.jpeg"
            alt="Settings"
            width={24}
            height={24}
            className={styles.bottomNavIcon}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
          <span className={styles.bottomNavLabel}>Settings</span>
        </Link>
      </nav>

      <main className={`${styles.main} ${selectedActionId ? styles.mainSplit : ''}`}>
        <div className={styles.leftPanel}>
          <div className={styles.pageHeader}>
            <h1>Overview</h1>
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

          {/* Trust Level Card */}
          {user && (
            <div className={styles.trustLevelCard}>
              <div className={styles.trustLevelHeader}>
                <h3 className={styles.trustLevelTitle}>Trust Level</h3>
              </div>
              <div className={styles.trustDisplay}>
                <div 
                  className={styles.trustBadge} 
                  style={{ backgroundColor: getTrustColor(user?.trustLevel) }}
                >
                  {getTrustLabel(user?.trustLevel)}
                </div>
                <div className={styles.trustInfo}>
                  <div className={styles.trustStat}>
                    <span className={styles.trustValue}>
                      {user?.preferences?.trainingRounds || 0}
                    </span>
                    <span className={styles.trustLabel}>Successful Actions</span>
                  </div>
                  <div className={styles.trustProgress}>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ 
                          width: `${Math.min((user?.preferences?.trainingRounds || 0) / 10 * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className={styles.progressText}>
                      {10 - (user?.preferences?.trainingRounds || 0) > 0 
                        ? `${10 - (user?.preferences?.trainingRounds || 0)} more to Autonomous`
                        : 'Autonomous Mode!'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                        onClick={() => handleViewDetails(action.id)}
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
        </div>

        {/* Detail Panel */}
        {selectedActionId && (
          <div className={styles.rightPanel}>
            <div className={styles.panelHeader}>
              <h2>Action Details</h2>
              <button
                onClick={handleCloseDetails}
                className={styles.closeButton}
                aria-label="Close details"
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

            <div className={styles.panelContent}>
              {actionLoading ? (
                <div className={styles.loading}>Loading action details...</div>
              ) : selectedAction ? (
                <>
                  {/* Header */}
                  <div className={styles.detailHeader}>
                    <div className={styles.detailHeaderLeft}>
                      <div className={styles.detailIcon}>
                        {getActionIcon(selectedAction.type)}
                      </div>
                      <div>
                        <h1 className={styles.detailTitle}>
                          {selectedAction.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h1>
                        <p className={styles.detailSubtitle}>
                          {selectedAction.input || 'No input provided'}
                        </p>
                      </div>
                    </div>
                    <div
                      className={styles.detailStatusBadge}
                      style={{
                        backgroundColor: `${getStatusColor(selectedAction.status)}20`,
                        color: getStatusColor(selectedAction.status),
                      }}
                    >
                      {selectedAction.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className={styles.detailSection}>
                    <h2>Action Timeline</h2>
                    <div className={styles.detailTimeline}>
                      <div className={styles.detailTimelineItem}>
                        <div className={styles.detailTimelineDot}></div>
                        <div className={styles.detailTimelineContent}>
                          <div className={styles.detailTimelineTitle}>Request Received</div>
                          <div className={styles.detailTimelineDate}>
                            {new Date(selectedAction.createdAt).toLocaleString()}
                          </div>
                          <div className={styles.detailTimelineDescription}>
                            User requested: "{selectedAction.input}"
                          </div>
                        </div>
                      </div>

                      {selectedAction.plan && selectedAction.plan.length > 0 && (
                        <div className={styles.detailTimelineItem}>
                          <div className={styles.detailTimelineDot}></div>
                          <div className={styles.detailTimelineContent}>
                            <div className={styles.detailTimelineTitle}>Plan Generated</div>
                            <div className={styles.detailTimelineDescription}>
                              Created {selectedAction.plan.length}-step action plan
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedAction.approvedAt && (
                        <div className={styles.detailTimelineItem}>
                          <div className={styles.detailTimelineDot}></div>
                          <div className={styles.detailTimelineContent}>
                            <div className={styles.detailTimelineTitle}>Approved</div>
                            <div className={styles.detailTimelineDate}>
                              {new Date(selectedAction.approvedAt).toLocaleString()}
                            </div>
                            <div className={styles.detailTimelineDescription}>
                              User approved the action plan
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedAction.status === 'executing' && (
                        <div className={styles.detailTimelineItem}>
                          <div className={`${styles.detailTimelineDot} ${styles.pulsing}`}></div>
                          <div className={styles.detailTimelineContent}>
                            <div className={styles.detailTimelineTitle}>Executing</div>
                            <div className={styles.detailTimelineDescription}>
                              Action in progress...
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedAction.completedAt && (
                        <div className={styles.detailTimelineItem}>
                          <div className={styles.detailTimelineDot}></div>
                          <div className={styles.detailTimelineContent}>
                            <div className={styles.detailTimelineTitle}>Completed</div>
                            <div className={styles.detailTimelineDate}>
                              {new Date(selectedAction.completedAt).toLocaleString()}
                            </div>
                            <div className={styles.detailTimelineDescription}>
                              Action successfully completed
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plan Details */}
                  {selectedAction.plan && selectedAction.plan.length > 0 && (
                    <div className={styles.detailSection}>
                      <h2>Action Plan</h2>
                      <div className={styles.detailPlanSteps}>
                        {selectedAction.plan.map((step: any, idx: number) => (
                          <div key={idx} className={styles.detailPlanStep}>
                            <div className={styles.detailStepNumber}>
                              {step.number || idx + 1}
                            </div>
                            <div className={styles.detailStepContent}>
                              <div className={styles.detailStepTitle}>
                                {step.description}
                              </div>
                              {step.details && (
                                <div className={styles.detailStepDetails}>
                                  {step.details}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {selectedAction.result && (
                    <div className={styles.detailSection}>
                      <h2>Result</h2>
                      <div className={styles.detailResultCard}>
                        {selectedAction.result.success && (
                          <div className={styles.detailSuccessIcon}>✓</div>
                        )}
                        <div className={styles.detailResultMessage}>
                          {selectedAction.result.message}
                        </div>
                        {selectedAction.result.details && (
                          <div className={styles.detailResultDetails}>
                            <pre>
                              {JSON.stringify(selectedAction.result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {selectedAction.feedback ? (
                    <div className={styles.detailSection}>
                      <h2>Your Feedback</h2>
                      <div className={styles.detailFeedbackCard}>
                        <div className={styles.detailRating}>
                          {'⭐'.repeat(selectedAction.feedback.rating)}
                        </div>
                        <div className={styles.detailFeedbackStatus}>
                          {selectedAction.feedback.wasCorrect
                            ? '✓ Correct'
                            : '✗ Needs Improvement'}
                        </div>
                        {selectedAction.feedback.comment && (
                          <div className={styles.detailFeedbackComment}>
                            "{selectedAction.feedback.comment}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selectedAction.status === 'completed' && (
                    <div className={styles.detailSection}>
                      <button
                        onClick={() => router.push(`/feedback?actionId=${selectedActionId}`)}
                        className={styles.detailFeedbackButton}
                      >
                        Provide Feedback ⭐
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.error}>Action not found</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

