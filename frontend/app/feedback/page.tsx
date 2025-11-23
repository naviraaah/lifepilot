'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getActionStatus, submitFeedback } from '../../lib/api';
import styles from './feedback.module.css';

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionId = searchParams.get('actionId');
  const userId = 'demo_user_123';

  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [rating, setRating] = useState(0);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [corrections, setCorrections] = useState({
    preferredProvider: '',
    preferredTime: '',
    avoidProvider: ''
  });
  const [mistakeType, setMistakeType] = useState('');

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
      
      // If already has feedback, show it
      if (actionData.feedback) {
        setRating(actionData.feedback.rating);
        setWasCorrect(actionData.feedback.wasCorrect);
        setComment(actionData.feedback.comment || '');
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error loading action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (wasCorrect === null) {
      alert('Please indicate if the action was correct');
      return;
    }

    try {
      setSubmitting(true);
      
      const feedbackData: any = {
        userId,
        actionId: actionId!,
        rating,
        wasCorrect,
        comment: comment.trim() || undefined
      };

      // Only include corrections if action was incorrect
      if (!wasCorrect) {
        const cleanCorrections: any = {};
        if (corrections.preferredProvider) cleanCorrections.preferredProvider = corrections.preferredProvider;
        if (corrections.preferredTime) cleanCorrections.preferredTime = corrections.preferredTime;
        if (corrections.avoidProvider) cleanCorrections.avoidProvider = corrections.avoidProvider;
        
        if (Object.keys(cleanCorrections).length > 0) {
          feedbackData.corrections = cleanCorrections;
        }

        if (mistakeType) {
          feedbackData.mistakeType = mistakeType;
        }
      }

      await submitFeedback(feedbackData);
      setSubmitted(true);
      
      // Redirect after a moment
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
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

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>🎉</div>
          <h2>Thank You!</h2>
          <p>Your feedback helps me learn and improve.</p>
          <p className={styles.successMessage}>
            {wasCorrect 
              ? "Great! I'll keep doing what I did right." 
              : "I understand. I'll learn from this and do better next time."}
          </p>
          <button onClick={() => router.push('/')} className={styles.dashboardButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>⭐ Give Feedback</h1>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          ← Dashboard
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.feedbackCard}>
          <div className={styles.actionSummary}>
            <h3>Action Summary</h3>
            <p className={styles.actionType}>
              {action.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </p>
            <p className={styles.actionInput}>"{action.input || 'No input provided'}"</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Rating */}
            <div className={styles.formGroup}>
              <label>How would you rate this action?</label>
              <div className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.star} ${star <= rating ? styles.filled : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <p className={styles.ratingLabel}>
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Correctness */}
            <div className={styles.formGroup}>
              <label>Did I get everything right?</label>
              <div className={styles.correctnessButtons}>
                <button
                  type="button"
                  className={`${styles.correctnessButton} ${wasCorrect === true ? styles.active : ''}`}
                  onClick={() => setWasCorrect(true)}
                >
                  ✓ Yes, Perfect!
                </button>
                <button
                  type="button"
                  className={`${styles.correctnessButton} ${wasCorrect === false ? styles.active : ''}`}
                  onClick={() => setWasCorrect(false)}
                >
                  ✗ No, Needs Work
                </button>
              </div>
            </div>

            {/* Corrections (if incorrect) */}
            {wasCorrect === false && (
              <div className={styles.correctionsSection}>
                <h4>Help me learn - What should I have done?</h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor="mistakeType">Type of mistake</label>
                  <select
                    id="mistakeType"
                    value={mistakeType}
                    onChange={(e) => setMistakeType(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select mistake type</option>
                    <option value="wrong_provider">Wrong provider/vendor</option>
                    <option value="wrong_time">Wrong time/date</option>
                    <option value="wrong_amount">Wrong amount</option>
                    <option value="wrong_details">Wrong details</option>
                    <option value="missed_preference">Missed my preference</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="preferredProvider">Preferred provider (if applicable)</label>
                  <input
                    type="text"
                    id="preferredProvider"
                    value={corrections.preferredProvider}
                    onChange={(e) => setCorrections({...corrections, preferredProvider: e.target.value})}
                    placeholder="e.g., Dr. Smith's Dental"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="preferredTime">Preferred time (if applicable)</label>
                  <input
                    type="text"
                    id="preferredTime"
                    value={corrections.preferredTime}
                    onChange={(e) => setCorrections({...corrections, preferredTime: e.target.value})}
                    placeholder="e.g., After 5pm on weekdays"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="avoidProvider">Avoid this provider in future</label>
                  <input
                    type="text"
                    id="avoidProvider"
                    value={corrections.avoidProvider}
                    onChange={(e) => setCorrections({...corrections, avoidProvider: e.target.value})}
                    placeholder="e.g., Downtown Clinic"
                    className={styles.input}
                  />
                </div>
              </div>
            )}

            {/* Comment */}
            <div className={styles.formGroup}>
              <label htmlFor="comment">Additional comments (optional)</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any other feedback you'd like to share?"
                className={styles.textarea}
                rows={4}
              />
            </div>

            <div className={styles.submitSection}>
              <p className={styles.privacyNote}>
                🔒 Your feedback is used to improve my performance and is kept confidential.
              </p>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || rating === 0 || wasCorrect === null}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

