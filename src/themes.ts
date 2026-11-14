export type ThemeId = 'studio' | 'academic' | 'codecademy' | 'dark';

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  swatchPrimary: string;
  swatchSecondary: string;
  swatchBg: string;
  isDark: boolean;
  radarCurrentStroke: string;
  radarCurrentFill: string;
  radarTargetStroke: string;
  radarTargetFill: string;
  radarGridStroke: string;
  bannerGradient: string;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'studio',
    name: 'Meridian Studio',
    subtitle: 'Navy sidebar & Sapphire',
    swatchPrimary: '#2563EB',
    swatchSecondary: '#0D9488',
    swatchBg: '#0F172A',
    isDark: false,
    radarCurrentStroke: '#2563EB',
    radarCurrentFill: 'rgba(37, 99, 235, 0.22)',
    radarTargetStroke: '#EA580C',
    radarTargetFill: 'rgba(234, 88, 12, 0.06)',
    radarGridStroke: '#E2E8F0',
    bannerGradient: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 52%, #0F766E 100%)',
  },
  {
    id: 'academic',
    name: 'Coursera Academic',
    subtitle: 'Clean white & Royal Blue',
    swatchPrimary: '#0056D2',
    swatchSecondary: '#0EA5E9',
    swatchBg: '#FFFFFF',
    isDark: false,
    radarCurrentStroke: '#0056D2',
    radarCurrentFill: 'rgba(0, 86, 210, 0.20)',
    radarTargetStroke: '#D97706',
    radarTargetFill: 'rgba(217, 119, 6, 0.06)',
    radarGridStroke: '#E2E8F0',
    bannerGradient: 'linear-gradient(135deg, #00255D 0%, #0056D2 65%, #0284C7 100%)',
  },
  {
    id: 'codecademy',
    name: 'Codecademy Cream',
    subtitle: 'Warm cream & Electric Violet',
    swatchPrimary: '#6D28D9',
    swatchSecondary: '#F59E0B',
    swatchBg: '#FFFDF7',
    isDark: false,
    radarCurrentStroke: '#6D28D9',
    radarCurrentFill: 'rgba(109, 40, 217, 0.20)',
    radarTargetStroke: '#D97706',
    radarTargetFill: 'rgba(217, 119, 6, 0.07)',
    radarGridStroke: '#E7E2D8',
    bannerGradient: 'linear-gradient(135deg, #10162F 0%, #3B0764 55%, #6D28D9 100%)',
  },
  {
    id: 'dark',
    name: 'Night Code Lab',
    subtitle: 'Dark mode & Sky Cyan',
    swatchPrimary: '#0284C7',
    swatchSecondary: '#10B981',
    swatchBg: '#0B1120',
    isDark: true,
    radarCurrentStroke: '#38BDF8',
    radarCurrentFill: 'rgba(56, 189, 248, 0.25)',
    radarTargetStroke: '#FB923C',
    radarTargetFill: 'rgba(251, 146, 60, 0.08)',
    radarGridStroke: '#334155',
    bannerGradient: 'linear-gradient(135deg, #0F172A 0%, #0C4A6E 55%, #065F46 100%)',
  },
];

export function getThemeById(id: string | undefined): AppTheme {
  return APP_THEMES.find((t) => t.id === id) || APP_THEMES[0];
}
