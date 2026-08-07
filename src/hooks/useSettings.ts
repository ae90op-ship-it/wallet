import { useState, useEffect } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  currency: string;
  favoriteCurrencies: string[];
  weekStartDay: 'saturday' | 'sunday' | 'monday';
  defaultReportPeriod: string;
  showPercentages: boolean;
  showCharts: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  accentColor: '#f59e0b',
  currency: 'EGP',
  favoriteCurrencies: ['EGP', 'USD', 'SAR', 'AED'],
  weekStartDay: 'saturday',
  defaultReportPeriod: 'this_month',
  showPercentages: true,
  showCharts: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('wallet_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('wallet_settings', JSON.stringify(settings));
    
    // Apply theme
    const isDark = 
      settings.theme === 'dark' || 
      (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply accent color
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    
    // Auto contrast for text on accent
    const hex = settings.accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const contrastColor = (yiq >= 128) ? '#0f172a' : '#ffffff';
    document.documentElement.style.setProperty('--accent-foreground', contrastColor);
    
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return { settings, updateSettings };
}
