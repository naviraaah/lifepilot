'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getUser, updateUser, linkEmail, linkPhone, getUserMemories, createMemory, updateMemory } from '../../lib/api';
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
  const [memories, setMemories] = useState<any[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);

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
    loadMemories();
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
    } catch (error: any) {
      console.error('Error loading user:', error);
      // If 404, the backend should create the user, but if it doesn't, use defaults
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
      
      // Try to create the user on the backend if it doesn't exist
      if (error.response?.status === 404) {
        try {
          // The backend should auto-create, but if not, we'll just use the defaults
          // The user will be created on first API call that requires it
        } catch (createError) {
          console.error('Error creating user:', createError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    try {
      setMemoriesLoading(true);
      const memoriesData = await getUserMemories(userId);
      
      // The API returns { count, memories: [...] }
      // Ensure memories is always an array
      let memoriesArray: any[] = [];
      if (Array.isArray(memoriesData)) {
        memoriesArray = memoriesData;
      } else if (memoriesData && Array.isArray(memoriesData.memories)) {
        memoriesArray = memoriesData.memories;
      } else if (memoriesData && memoriesData.data && Array.isArray(memoriesData.data)) {
        memoriesArray = memoriesData.data;
      }
      
      setMemories(memoriesArray);
      
      // If no memories exist, create the default Liam memory
      if (memoriesArray.length === 0) {
        await createLiamMemory();
      }
    } catch (error) {
      console.error('Error loading memories:', error);
      // Set empty array on error and try to create default memory
      setMemories([]);
      await createLiamMemory();
    } finally {
      setMemoriesLoading(false);
    }
  };

  const createLiamMemory = async () => {
    try {
      // Check if Liam's memory already exists
      const existingMemories = await getUserMemories(userId);
      const memoriesArray = Array.isArray(existingMemories) 
        ? existingMemories 
        : (existingMemories?.memories || []);
      
      const liamMemoryExists = memoriesArray.some(
        (m: any) => m.title === "Liam's Personal Information" || m.category === 'personal_info'
      );
      
      if (liamMemoryExists) {
        // Reload memories if it already exists
        setMemories(memoriesArray);
        return;
      }
      
      const liamMemory = {
        userId,
        type: 'preference',
        category: 'personal_info',
        title: "Liam's Personal Information",
        description: `Liam stays in Sunnyvale, California and works for a tech company, Apple. He goes to New York City to meet his girlfriend for Thanksgiving and his birthday weekend in February. He also likes to gym a lot. Because he lives in Sunnyvale, there are so many good food options in downtown Sunnyvale. He also likes to hang out in SF near the North Beach area, that's where he spends most of his time. He likes to go out, eat food, and play games.

He usually visits his family for Thanksgiving. He has four family members: his parents, his brother, and his brother's wife (his sister-in-law). So, he usually needs to buy four Thanksgiving gifts. Typically, two gifts are for men (his father and brother), and two are for women (his mother and sister-in-law).

Liam is recently getting a lot of dental issues and needs to book an appointment with the dentist very soon. He wants to book it near his place in Sunnyvale only, so that it's convenient for him. He also works from the Sunnyvale Apple office, so it's easier for him to get all his appointments and schedules around Sunnyvale.`,
        metadata: {
          location: 'Sunnyvale, California',
          workplace: 'Apple',
          frequentLocations: ['Sunnyvale', 'San Francisco - North Beach'],
          interests: ['gym', 'food', 'games'],
          family: {
            members: 4,
            thanksgivingGifts: {
              men: 2,
              women: 2
            }
          },
          preferences: {
            appointments: 'Sunnyvale area',
            dentalIssues: true
          }
        }
      };
      
      const result = await createMemory(liamMemory);
      
      // Reload memories after creating
      const updatedMemories = await getUserMemories(userId);
      const updatedArray = Array.isArray(updatedMemories) 
        ? updatedMemories 
        : (updatedMemories?.memories || []);
      setMemories(updatedArray);
    } catch (error) {
      console.error('Error creating Liam memory:', error);
      // On error, still try to load existing memories
      try {
        const existingMemories = await getUserMemories(userId);
        const memoriesArray = Array.isArray(existingMemories) 
          ? existingMemories 
          : (existingMemories?.memories || []);
        setMemories(memoriesArray);
      } catch (loadError) {
        console.error('Error loading memories after create failure:', loadError);
        setMemories([]);
      }
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
        <div className={styles.loading}>Loading settings...</div>
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

        {/* Personalization */}
        <div className={styles.section}>
          <h2>Personalization</h2>
          <p className={styles.sectionDescription}>
            Store personal information and preferences to help LifePilot provide more customized and personalized suggestions.
          </p>
          <div className={styles.card}>
            {memoriesLoading ? (
              <div className={styles.loading}>Loading memories...</div>
            ) : memories.length === 0 ? (
              <div className={styles.emptyMemories}>
                <p>No memories stored yet. LifePilot will learn your preferences over time.</p>
              </div>
            ) : Array.isArray(memories) && memories.length > 0 ? (
              <div className={styles.memoriesList}>
                {memories.map((memory) => (
                  <div key={memory.id} className={styles.memoryItem}>
                    <div className={styles.memoryHeader}>
                      <div className={styles.memoryTitle}>{memory.title}</div>
                      <div className={styles.memoryCategory}>{memory.category}</div>
                    </div>
                    <div className={styles.memoryDescription}>{memory.description}</div>
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <div className={styles.memoryMetadata}>
                        <div className={styles.metadataTitle}>Key Details:</div>
                        <div className={styles.metadataContent}>
                          {memory.metadata.location && (
                            <div className={styles.metadataItem}>
                              <span className={styles.metadataLabel}>Location:</span>
                              <span className={styles.metadataValue}>{memory.metadata.location}</span>
                            </div>
                          )}
                          {memory.metadata.workplace && (
                            <div className={styles.metadataItem}>
                              <span className={styles.metadataLabel}>Workplace:</span>
                              <span className={styles.metadataValue}>{memory.metadata.workplace}</span>
                            </div>
                          )}
                          {memory.metadata.frequentLocations && (
                            <div className={styles.metadataItem}>
                              <span className={styles.metadataLabel}>Frequent Locations:</span>
                              <span className={styles.metadataValue}>
                                {Array.isArray(memory.metadata.frequentLocations)
                                  ? memory.metadata.frequentLocations.join(', ')
                                  : memory.metadata.frequentLocations}
                              </span>
                            </div>
                          )}
                          {memory.metadata.interests && (
                            <div className={styles.metadataItem}>
                              <span className={styles.metadataLabel}>Interests:</span>
                              <span className={styles.metadataValue}>
                                {Array.isArray(memory.metadata.interests)
                                  ? memory.metadata.interests.join(', ')
                                  : memory.metadata.interests}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyMemories}>
                <p>No memories stored yet. LifePilot will learn your preferences over time.</p>
              </div>
            )}
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

