'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, updateUser, linkEmail, linkPhone } from '../../lib/api';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const userId = 'demo_user_123';

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferences: {
      notificationEmail: true,
      notificationSMS: true,
      autoApproveAfterTraining: false
    }
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await getUser(userId);
      setUser(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        preferences: userData.preferences
      });
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      await updateUser(userId, formData);
      setMessage('Settings saved successfully!');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          ← Back to Home
        </button>
      </nav>

      <div className={styles.content}>
        <h1>Settings</h1>
        <p className={styles.subtitle}>Manage your account and preferences</p>

        {message && (
          <div className={`${styles.message} ${message.includes('Failed') ? styles.error : styles.success}`}>
            {message}
          </div>
        )}

        {/* Profile Section */}
        <div className={styles.section}>
          <h2>Profile</h2>
          <div className={styles.card}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Your name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Trust Level */}
        <div className={styles.section}>
          <h2>Trust Level</h2>
          <div className={styles.card}>
            <div className={styles.trustDisplay}>
              <div className={styles.trustBadge} style={{ backgroundColor: getTrustColor(user?.trustLevel) }}>
                {getTrustLabel(user?.trustLevel)}
              </div>
              <div className={styles.trustInfo}>
                <div className={styles.trustStat}>
                  <span className={styles.trustValue}>{user?.preferences?.trainingRounds || 0}</span>
                  <span className={styles.trustLabel}>Successful Actions</span>
                </div>
                <div className={styles.trustProgress}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${Math.min((user?.preferences?.trainingRounds || 0) / 10 * 100, 100)}%` }}
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
        </div>

        {/* Preferences */}
        <div className={styles.section}>
          <h2>Preferences</h2>
          <div className={styles.card}>
            <div className={styles.preference}>
              <div className={styles.preferenceInfo}>
                <div className={styles.preferenceLabel}>Email Notifications</div>
                <div className={styles.preferenceDescription}>
                  Receive email updates about your actions
                </div>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={formData.preferences.notificationEmail}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {...formData.preferences, notificationEmail: e.target.checked}
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.preference}>
              <div className={styles.preferenceInfo}>
                <div className={styles.preferenceLabel}>SMS Notifications</div>
                <div className={styles.preferenceDescription}>
                  Get text updates for important actions
                </div>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={formData.preferences.notificationSMS}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {...formData.preferences, notificationSMS: e.target.checked}
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.preference}>
              <div className={styles.preferenceInfo}>
                <div className={styles.preferenceLabel}>Ask Before Submitting</div>
                <div className={styles.preferenceDescription}>
                  Always show me the plan before executing (recommended until Autonomous)
                </div>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={!formData.preferences.autoApproveAfterTraining}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {...formData.preferences, autoApproveAfterTraining: !e.target.checked}
                  })}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className={styles.section}>
          <h2>Integrations</h2>
          <div className={styles.card}>
            <div className={styles.integration}>
              <div className={styles.integrationIcon}>📧</div>
              <div className={styles.integrationInfo}>
                <div className={styles.integrationName}>Email</div>
                <div className={styles.integrationStatus}>
                  {user?.linkedAccounts?.email?.linked ? 'Connected' : 'Not Connected'}
                </div>
              </div>
              <button className={styles.integrationButton}>
                {user?.linkedAccounts?.email?.linked ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            <div className={styles.integration}>
              <div className={styles.integrationIcon}>📱</div>
              <div className={styles.integrationInfo}>
                <div className={styles.integrationName}>Phone</div>
                <div className={styles.integrationStatus}>
                  {user?.linkedAccounts?.phone?.verified ? 'Verified' : 'Not Verified'}
                </div>
              </div>
              <button className={styles.integrationButton}>
                {user?.linkedAccounts?.phone?.verified ? 'Disconnect' : 'Verify'}
              </button>
            </div>

            <div className={styles.integration}>
              <div className={styles.integrationIcon}>📅</div>
              <div className={styles.integrationInfo}>
                <div className={styles.integrationName}>Calendar</div>
                <div className={styles.integrationStatus}>Coming Soon</div>
              </div>
              <button className={styles.integrationButton} disabled>
                Connect
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={() => router.push('/')} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function getTrustColor(level: string) {
  switch (level) {
    case 'autonomous': return '#10b981';
    case 'trusted': return '#3b82f6';
    case 'training': return '#f59e0b';
    default: return '#6b7280';
  }
}

function getTrustLabel(level: string) {
  switch (level) {
    case 'autonomous': return '🤖 Autonomous';
    case 'trusted': return '✅ Trusted';
    case 'training': return '📚 Training';
    default: return '👋 New';
  }
}

