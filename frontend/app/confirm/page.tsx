'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getActionStatus, approveAction, rejectAction, executeAction } from '../../lib/api';
import styles from './confirm.module.css';

export default function ConfirmAction() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionId = searchParams.get('actionId');
  const userId = 'demo_user_123'; // In production, get from auth

  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'executing' | 'complete'>('review');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (actionId) {
      loadAction();
    }
  }, [actionId]);

  const loadAction = async () => {
    try {
      setLoading(true);
      const actionData = await getActionStatus(actionId!, userId);
      setAction(actionData);
      
      // If already approved or executing, skip to appropriate step
      if (actionData.status === 'executing') {
        setStep('executing');
      } else if (actionData.status === 'completed') {
        setStep('complete');
        setResult(actionData.result);
      }
    } catch (error) {
      console.error('Error loading action:', error);
      alert('Failed to load action details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      
      // Approve the action
      await approveAction(actionId!, userId);
      
      // Execute the action
      setStep('executing');
      const executionResult = await executeAction(actionId!);
      
      setResult(executionResult);
      setStep('complete');
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Failed to execute action. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Why are you rejecting this action? (This helps me learn)');
    if (!reason) return;

    try {
      setProcessing(true);
      await rejectAction(actionId!, userId, reason);
      router.push('/');
    } catch (error) {
      console.error('Error rejecting action:', error);
      alert('Failed to reject action');
    } finally {
      setProcessing(false);
    }
  };

  const handleFeedback = () => {
    router.push(`/feedback?actionId=${actionId}`);
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>✈️ LifePilot</h1>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          ← Back to Home
        </button>
      </header>

      <main className={styles.main}>
        {step === 'review' && (
          <div className={styles.reviewSection}>
            <div className={styles.planCard}>
              <div className={styles.cardHeader}>
                <h2>📋 Action Plan Review</h2>
                <div className={styles.confidenceBadge}>
                  Confidence: {Math.round((action.plan?.confidence || 0.8) * 100)}%
                </div>
              </div>

              <div className={styles.summary}>
                <h3>Summary</h3>
                <p>{action.metadata?.summary || 'Review the steps below'}</p>
              </div>

              <div className={styles.steps}>
                <h3>Planned Steps</h3>
                <ol className={styles.stepList}>
                  {(action.plan || []).map((step: any, idx: number) => (
                    <li key={idx} className={styles.step}>
                      <div className={styles.stepNumber}>{step.number || idx + 1}</div>
                      <div className={styles.stepContent}>
                        <h4>{step.description}</h4>
                        {step.details && <p>{step.details}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {action.metadata?.assumptions && action.metadata.assumptions.length > 0 && (
                <div className={styles.assumptions}>
                  <h3>⚠️ Assumptions I'm Making</h3>
                  <ul>
                    {action.metadata.assumptions.map((assumption: string, idx: number) => (
                      <li key={idx}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              {action.metadata?.estimatedTime && (
                <div className={styles.timeEstimate}>
                  <span>⏱️ Estimated time:</span>
                  <strong>{action.metadata.estimatedTime}</strong>
                </div>
              )}

              <div className={styles.trustInfo}>
                <div className={styles.trustIcon}>🔒</div>
                <div className={styles.trustText}>
                  <h4>Why am I showing you this?</h4>
                  <p>
                    I want to be transparent about what I'll do before I do it. 
                    This builds trust between us. As we work together more, and you 
                    approve my plans consistently, I'll gradually become more autonomous.
                  </p>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  onClick={handleReject}
                  className={styles.rejectButton}
                  disabled={processing}
                >
                  ✗ Not Right - Let Me Adjust
                </button>
                <button
                  onClick={handleApprove}
                  className={styles.approveButton}
                  disabled={processing}
                >
                  {processing ? 'Executing...' : '✓ Looks Good - Proceed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'executing' && (
          <div className={styles.executingSection}>
            <div className={styles.spinner}></div>
            <h2>Executing Your Request...</h2>
            <p>I'm working on this right now. This should take a moment.</p>
            <div className={styles.progressSteps}>
              {(action.plan || []).map((step: any, idx: number) => (
                <div key={idx} className={styles.progressStep}>
                  <div className={styles.progressDot}></div>
                  <span>{step.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'complete' && result && (
          <div className={styles.completeSection}>
            <div className={styles.successIcon}>
              {result.success ? '✅' : '❌'}
            </div>
            <h2>{result.success ? 'Action Completed!' : 'Something Went Wrong'}</h2>
            <p className={styles.resultMessage}>{result.message}</p>

            {result.result && (
              <div className={styles.resultDetails}>
                <h3>Details</h3>
                <pre>{JSON.stringify(result.result, null, 2)}</pre>
              </div>
            )}

            {result.success && (
              <div className={styles.feedbackPrompt}>
                <h3>How did I do?</h3>
                <p>Your feedback helps me learn and improve!</p>
                <button onClick={handleFeedback} className={styles.feedbackButton}>
                  Give Feedback ⭐
                </button>
              </div>
            )}

            <div className={styles.completeActions}>
              <button onClick={() => router.push('/')} className={styles.dashboardButton}>
                Back to Home
              </button>
              <button onClick={() => router.push('/timeline')} className={styles.timelineButton}>
                View Timeline
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

