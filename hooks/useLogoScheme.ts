import { useColorScheme } from '@/hooks/useColorScheme';

export function useLogoScheme() {
  const colorScheme = useColorScheme();
  const logoSource =
    colorScheme === 'dark'
      ? require('@/assets/images/auth-icon-dark.png')
      : require('@/assets/images/auth-icon-light.png');

  return logoSource;
}
