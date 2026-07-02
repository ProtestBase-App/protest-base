import Constants from 'expo-constants';

export function getAppEnv(): 'development' | 'preview' | 'production' {
  return (
    (Constants.expoConfig?.extra?.appEnv as 'development' | 'preview' | 'production' | undefined) ||
    'development'
  );
}
