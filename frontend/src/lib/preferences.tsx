'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface UserPreferences {
  // Appearance
  theme: 'light' | 'dark';
  language: 'id' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  animationsEnabled: boolean;
  sidebarCollapsed: boolean;
  
  // Notifications
  emailPrefs: Record<string, boolean>;
  pushPrefs: Record<string, boolean>;
  inAppPrefs: Record<string, boolean>;
  
  // Security (stored separately, just flags here)
  mfaEnabled: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  language: 'id',
  fontSize: 'medium',
  compactMode: false,
  animationsEnabled: true,
  sidebarCollapsed: false,
  emailPrefs: {
    new_patient: true,
    document_upload: true,
    document_shared: true,
    retention_expiring: true,
    system_alerts: true,
    weekly_digest: false,
  },
  pushPrefs: {
    new_patient: true,
    document_upload: false,
    document_shared: true,
    retention_expiring: true,
    system_alerts: true,
  },
  inAppPrefs: {
    new_patient: true,
    document_upload: true,
    document_shared: true,
    retention_expiring: true,
    system_alerts: true,
  },
  mfaEnabled: false,
};

const STORAGE_KEY = 'medstore-user-preferences';

function getStoredPrefs(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: UserPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore write errors
  }
}

interface PreferencesContextType {
  prefs: UserPreferences;
  updatePrefs: (partial: Partial<UserPreferences>) => void;
  resetPrefs: () => void;
}

const PreferencesContext = createContext<PreferencesContextType>({
  prefs: DEFAULT_PREFS,
  updatePrefs: () => {},
  resetPrefs: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredPrefs();
    setPrefs(stored);
    
    // Apply theme on mount
    document.documentElement.classList.toggle('dark', stored.theme === 'dark');
    
    // Apply font size
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${stored.fontSize}`);
    
    // Apply compact mode
    document.documentElement.classList.toggle('compact-mode', stored.compactMode);
    
    // Apply animations
    document.documentElement.classList.toggle('animations-disabled', !stored.animationsEnabled);
    
    // Apply sidebar collapsed
    document.documentElement.classList.toggle('sidebar-collapsed-default', stored.sidebarCollapsed);
  }, []);

  const updatePrefs = useCallback((partial: Partial<UserPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      
      // Apply immediate effects
      if (partial.theme !== undefined) {
        document.documentElement.classList.toggle('dark', partial.theme === 'dark');
      }
      if (partial.fontSize !== undefined) {
        document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
        document.documentElement.classList.add(`font-size-${partial.fontSize}`);
      }
      if (partial.compactMode !== undefined) {
        document.documentElement.classList.toggle('compact-mode', partial.compactMode);
      }
      if (partial.animationsEnabled !== undefined) {
        document.documentElement.classList.toggle('animations-disabled', !partial.animationsEnabled);
      }
      if (partial.sidebarCollapsed !== undefined) {
        document.documentElement.classList.toggle('sidebar-collapsed-default', partial.sidebarCollapsed);
      }
      
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    savePrefs(DEFAULT_PREFS);
    
    // Reset all classes
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add('font-size-medium');
    document.documentElement.classList.remove('compact-mode');
    document.documentElement.classList.remove('animations-disabled');
    document.documentElement.classList.remove('sidebar-collapsed-default');
  }, []);

  // Always provide context (with defaults during SSR/initial render)
  // This prevents "usePreferences must be used within a PreferencesProvider" error
  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, resetPrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

// Helper hook for individual preference sections
export function useAppearancePrefs() {
  const { prefs, updatePrefs } = usePreferences();
  return {
    theme: prefs.theme,
    setTheme: (theme: 'light' | 'dark') => updatePrefs({ theme }),
    language: prefs.language,
    setLanguage: (language: 'id' | 'en') => updatePrefs({ language }),
    fontSize: prefs.fontSize,
    setFontSize: (fontSize: 'small' | 'medium' | 'large') => updatePrefs({ fontSize }),
    compactMode: prefs.compactMode,
    setCompactMode: (compactMode: boolean) => updatePrefs({ compactMode }),
    animationsEnabled: prefs.animationsEnabled,
    setAnimationsEnabled: (animationsEnabled: boolean) => updatePrefs({ animationsEnabled }),
    sidebarCollapsed: prefs.sidebarCollapsed,
    setSidebarCollapsed: (sidebarCollapsed: boolean) => updatePrefs({ sidebarCollapsed }),
  };
}

export function useNotificationPrefs() {
  const { prefs, updatePrefs } = usePreferences();
  return {
    emailPrefs: prefs.emailPrefs,
    setEmailPrefs: (emailPrefs: Record<string, boolean>) => updatePrefs({ emailPrefs }),
    pushPrefs: prefs.pushPrefs,
    setPushPrefs: (pushPrefs: Record<string, boolean>) => updatePrefs({ pushPrefs }),
    inAppPrefs: prefs.inAppPrefs,
    setInAppPrefs: (inAppPrefs: Record<string, boolean>) => updatePrefs({ inAppPrefs }),
  };
}

export function useSecurityPrefs() {
  const { prefs, updatePrefs } = usePreferences();
  return {
    mfaEnabled: prefs.mfaEnabled,
    setMfaEnabled: (mfaEnabled: boolean) => updatePrefs({ mfaEnabled }),
  };
}