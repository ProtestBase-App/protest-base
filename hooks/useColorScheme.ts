import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Wraps React Native's useColorScheme to normalize the return type.
 * RN 0.83+ can return "unspecified" which we treat as "light".
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
