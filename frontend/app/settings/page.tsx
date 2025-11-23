'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getUser, updateUser, linkEmail, linkPhone } from '../../lib/api';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname();
  const userId = 'demo_user_123';

  const [user, setUser] = useState<any>({
    id: userId,
    name: 'Liam',
    email: 'liam.anderson@email.com',
    phone: '+1 (415) 555-7890',
    preferences: {
      notificationEmail: true,
      notificationSMS: true,
      autoApproveAfterTraining: false,
      trainingRounds: 8
    },
    trustLevel: 'training',
    linkedAccounts: {
      email: { linked: true, provider: 'Gmail' },
      phone: { linked: true, verified: true },
      calendar: { linked: false, provider: null }
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const initialFormData = {
    name: 'Liam',
    email: 'liam.anderson@email.com',
    phone: '+1 (415) 555-7890',
    preferences: {
      notificationEmail: true,
      notificationSMS: true,
      autoApproveAfterTraining: false
    }
  };

  const [formData, setFormData] = useState(initialFormData);
  const [originalFormData, setOriginalFormData] = useState(initialFormData);

  useEffect(() => {
    loadUser();
  }, []);

  // Check if form has changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await getUser(userId);
      setUser(userData);
      const loadedFormData = {
        name: userData.name || 'Liam',
        email: userData.email || 'liam.anderson@email.com',
        phone: userData.phone || '+1 (415) 555-7890',
        preferences: userData.preferences || {
          notificationEmail: true,
          notificationSMS: true,
          autoApproveAfterTraining: false
        }
      };
      setFormData(loadedFormData);
      setOriginalFormData(loadedFormData);
    } catch (error) {
      console.error('Error loading user:', error);
      // Set default Liam dummy data if API fails
      const defaultUser = {
        id: userId,
        name: 'Liam',
        email: 'liam.anderson@email.com',
        phone: '+1 (415) 555-7890',
        preferences: {
          notificationEmail: true,
          notificationSMS: true,
          autoApproveAfterTraining: false,
          trainingRounds: 8
        },
        trustLevel: 'training',
        linkedAccounts: {
          email: { linked: true, provider: 'Gmail' },
          phone: { linked: true, verified: true },
          calendar: { linked: false, provider: null }
        }
      };
      setUser(defaultUser);
      const defaultFormData = {
        name: defaultUser.name,
        email: defaultUser.email,
        phone: defaultUser.phone,
        preferences: defaultUser.preferences
      };
      setFormData(defaultFormData);
      setOriginalFormData(defaultFormData);
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
      // Update original data to reflect saved state
      setOriginalFormData({ ...formData });
      
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
        <div className={styles.loading}>Loading settings...</div>
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
              <div className={styles.integrationIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
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
              <div className={styles.integrationIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
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
              <div className={styles.integrationIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
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
          <button 
            onClick={handleSave} 
            className={styles.saveButton} 
            disabled={saving || !hasChanges}
          >
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
}

