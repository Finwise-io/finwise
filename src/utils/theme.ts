import { Platform } from 'react-native';

export const Colors = {
  primary: '#178F6B',
  primaryDark: '#0F6E56',
  primaryDeep: '#085041',
  primaryLight: '#E1F5EE',
  primaryMid: '#9FE1CB',

  amber: '#854F0B',
  amberLight: '#FAEEDA',
  amberMid: '#FAC775',

  red: '#A32D2D',
  redLight: '#FCEBEB',
  redMid: '#F7C1C1',

  blue: '#185FA5',
  blueLight: '#E6F1FB',
  blueMid: '#B5D4F4',

  white: '#FFFFFF',
  bgSecondary: '#F6F7F5',
  bgTertiary: '#EEEEE9',

  textPrimary: '#1A1A18',
  textSecondary: '#6B6B66',
  // textTertiary darkened #9E9E99 → #76766F to meet WCAG AA (~4.5:1 on white; was ~2.6:1 and hard to read
  // as small gray text — UI guidelines §5.2). Still lighter than textSecondary, so hierarchy is preserved.
  textTertiary: '#76766F',

  border: 'rgba(0,0,0,0.10)',
  borderStrong: 'rgba(0,0,0,0.20)',

  cardBg: '#FFFFFF',
  successGreen: '#5DCAA5',
};

export const Typography = {
  fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    hero: 38,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 100,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};
