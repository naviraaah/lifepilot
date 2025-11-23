'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getActionStatus } from '../../../lib/api';
import styles from './action-detail.module.css';

export default function ActionDetail() {
  const router = useRouter();
  const params = useParams();
  const actionId = params.id as string;
  const userId = 'demo_user_123';

  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAction();
  }, [actionId]);

  const loadAction = async () => {
    try {
      setLoading(true);
      const data = await getActionStatus(actionId, userId);
      setAction(data);
    } catch (error) {
      console.error('Error loading action:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading action details...</div>
      </div>
    );
  }

  if (!action) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Action not found</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending_approval': return '#F59E0B';
      case 'executing': return '#3B82F6';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getActionIcon = (type: string) => {
    if (type.includes('dentist')) return '🦷';
    if (type.includes('subscription')) return '❌';
    if (type.includes('dispute')) return '💳';
    return '📝';
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          ← Back to Home
        </button>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.icon}>{getActionIcon(action.type)}</div>
            <div>
              <h1>{action.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h1>
              <p className={styles.subtitle}>{action.input || 'No input provided'}</p>
            </div>
          </div>
          <div 
            className={styles.statusBadge} 
            style={{ backgroundColor: `${getStatusColor(action.status)}20`, color: getStatusColor(action.status) }}
          >
            {action.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </div>
        </div>

        {/* Timeline */}
        <div className={styles.section}>
          <h2>Action Timeline</h2>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineDot}></div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineTitle}>Request Received</div>
                <div className={styles.timelineDate}>
                  {new Date(action.createdAt).toLocaleString()}
                </div>
                <div className={styles.timelineDescription}>
                  User requested: "{action.input}"
                </div>
              </div>
            </div>

            {action.plan && action.plan.length > 0 && (
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Plan Generated</div>
                  <div className={styles.timelineDescription}>
                    Created {action.plan.length}-step action plan
                  </div>
                </div>
              </div>
            )}

            {action.approvedAt && (
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Approved</div>
                  <div className={styles.timelineDate}>
                    {new Date(action.approvedAt).toLocaleString()}
                  </div>
                  <div className={styles.timelineDescription}>
                    User approved the action plan
                  </div>
                </div>
              </div>
            )}

            {action.status === 'executing' && (
              <div className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${styles.pulsing}`}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Executing</div>
                  <div className={styles.timelineDescription}>
                    Action in progress...
                  </div>
                </div>
              </div>
            )}

            {action.completedAt && (
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Completed</div>
                  <div className={styles.timelineDate}>
                    {new Date(action.completedAt).toLocaleString()}
                  </div>
                  <div className={styles.timelineDescription}>
                    Action successfully completed
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan Details */}
        {action.plan && action.plan.length > 0 && (
          <div className={styles.section}>
            <h2>Action Plan</h2>
            <div className={styles.planSteps}>
              {action.plan.map((step: any, idx: number) => (
                <div key={idx} className={styles.planStep}>
                  <div className={styles.stepNumber}>{step.number || idx + 1}</div>
                  <div className={styles.stepContent}>
                    <div className={styles.stepTitle}>{step.description}</div>
                    {step.details && <div className={styles.stepDetails}>{step.details}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {action.result && (
          <div className={styles.section}>
            <h2>Result</h2>
            <div className={styles.resultCard}>
              {action.result.success && (
                <div className={styles.successIcon}>✓</div>
              )}
              <div className={styles.resultMessage}>{action.result.message}</div>
              {action.result.details && (
                <div className={styles.resultDetails}>
                  <pre>{JSON.stringify(action.result.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {action.feedback ? (
          <div className={styles.section}>
            <h2>Your Feedback</h2>
            <div className={styles.feedbackCard}>
              <div className={styles.rating}>
                {'⭐'.repeat(action.feedback.rating)}
              </div>
              <div className={styles.feedbackStatus}>
                {action.feedback.wasCorrect ? '✓ Correct' : '✗ Needs Improvement'}
              </div>
              {action.feedback.comment && (
                <div className={styles.feedbackComment}>"{action.feedback.comment}"</div>
              )}
            </div>
          </div>
        ) : action.status === 'completed' && (
          <div className={styles.section}>
            <button 
              onClick={() => router.push(`/feedback?actionId=${actionId}`)}
              className={styles.feedbackButton}
            >
              Provide Feedback ⭐
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

