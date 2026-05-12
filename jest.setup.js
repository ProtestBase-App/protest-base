// Jest setup file

// ============================================================================
// axios 1.15.0+ fetch adapter compatibility fix
// ============================================================================
// axios 1.15.0 prefers the fetch adapter when ReadableStream is globally available.
// Expo's ReadableStream polyfill throws "Cannot cancel a stream that already has a reader"
// during axios's adapter detection. Removing ReadableStream from globals forces axios
// to fall back to the http adapter for all tests.
delete global.ReadableStream;

// ============================================================================
// Extended matchers
// ============================================================================
require('@testing-library/jest-native/extend-expect');

// ============================================================================
// Expo module mocks
// ============================================================================
jest.mock('expo-font');
jest.mock('expo-asset');

jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props) => React.createElement(View, props),
  };
});

// expo-image-picker and expo-calendar are NOT globally mocked here because
// utils/__tests__/permissionHelpers.test.ts uses jest.mock() auto-mock which
// conflicts with manual factory mocks. Tests that need these should mock locally.

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  createURL: jest.fn((path) => `exp://localhost:8081/${path}`),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { eas: { projectId: 'test-project-id' } },
    },
  },
}));

// ============================================================================
// Navigation mocks
// ============================================================================
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    setParams: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  useGlobalSearchParams: jest.fn().mockReturnValue({}),
  useSegments: jest.fn().mockReturnValue([]),
  usePathname: jest.fn().mockReturnValue('/'),
  useNavigation: jest.fn().mockReturnValue({
    setOptions: jest.fn(),
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
  Redirect: ({ href }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'redirect' }, `Redirect to ${href}`);
  },
  Link: ({ children, href, ...props }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// ============================================================================
// Native component mocks
// ============================================================================
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Image, ScrollView, FlatList } = require('react-native');

  const createMockSharedValue = (init) => {
    const sv = { value: init, addListener: jest.fn(), removeListener: jest.fn() };
    return sv;
  };

  const identity = jest.fn((v) => v);

  const mockEasing = {
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    poly: jest.fn(() => identity),
    sin: identity,
    circle: identity,
    exp: identity,
    elastic: jest.fn(() => identity),
    back: jest.fn(() => identity),
    bounce: identity,
    bezier: jest.fn(() => identity),
    in: jest.fn((e) => e || identity),
    out: jest.fn((e) => e || identity),
    inOut: jest.fn((e) => e || identity),
  };

  const animatedComponent = (Component) => {
    const AnimatedComp = React.forwardRef((props, ref) =>
      React.createElement(Component, { ...props, ref })
    );
    AnimatedComp.displayName = `Animated(${
      Component.displayName || Component.name || 'Component'
    })`;
    return AnimatedComp;
  };

  return {
    __esModule: true,
    default: {
      View: animatedComponent(View),
      Text: animatedComponent(Text),
      Image: animatedComponent(Image),
      ScrollView: animatedComponent(ScrollView),
      FlatList: animatedComponent(FlatList),
      createAnimatedComponent: animatedComponent,
    },
    useSharedValue: jest.fn(createMockSharedValue),
    useAnimatedStyle: jest.fn((styleFactory) => {
      try {
        return styleFactory();
      } catch {
        return {};
      }
    }),
    useDerivedValue: jest.fn((fn) => createMockSharedValue(fn())),
    useAnimatedGestureHandler: jest.fn(() => ({})),
    useAnimatedScrollHandler: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDecay: jest.fn(() => 0),
    withDelay: jest.fn((_, value) => value),
    withSequence: jest.fn((...args) => args[args.length - 1]),
    withRepeat: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    useReducedMotion: jest.fn(() => false),
    runOnJS: jest.fn(
      (fn) =>
        (...args) =>
          fn(...args)
    ),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((val) => val),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: mockEasing,
    FadeIn: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeInDown: { duration: jest.fn().mockReturnThis() },
    FadeOutUp: { duration: jest.fn().mockReturnThis() },
    SlideInRight: { duration: jest.fn().mockReturnThis() },
    SlideOutLeft: { duration: jest.fn().mockReturnThis() },
    Layout: { duration: jest.fn().mockReturnThis() },
    ZoomIn: { duration: jest.fn().mockReturnThis() },
    ZoomOut: { duration: jest.fn().mockReturnThis() },
    createAnimatedComponent: animatedComponent,
  };
});

jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockMapView = (props) => React.createElement(View, { testID: 'map-view', ...props });
  const mockCamera = (props) => React.createElement(View, { testID: 'map-camera', ...props });
  return {
    __esModule: true,
    default: {
      MapView: mockMapView,
      Camera: mockCamera,
      setAccessToken: jest.fn(),
    },
    MapView: mockMapView,
    Camera: mockCamera,
    PointAnnotation: ({ children, ...props }) =>
      React.createElement(View, { testID: 'map-point-annotation', ...props }, children),
    Callout: (props) => React.createElement(View, { testID: 'map-callout', ...props }),
    MarkerView: (props) => React.createElement(View, { testID: 'map-marker-view', ...props }),
    setAccessToken: jest.fn(),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = (props) => React.createElement(Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
  };
});

jest.mock('@expo/vector-icons/build/vendor/react-native-vector-icons/lib/create-icon-set', () => {
  return () => {
    const React = require('react');
    const { Text } = require('react-native');
    return (props) => React.createElement(Text, props, props.name || 'icon');
  };
});

jest.mock('react-native-element-dropdown', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Dropdown: ({ data, value, onChange, placeholder, testID, ...props }) => {
      return React.createElement(
        View,
        { testID: testID || 'dropdown' },
        React.createElement(Text, { key: 'placeholder' }, value || placeholder || 'Select...')
      );
    },
    MultiSelect: ({ data, value, onChange, placeholder, testID, ...props }) => {
      return React.createElement(
        View,
        { testID: testID || 'multiselect' },
        React.createElement(
          Text,
          { key: 'placeholder' },
          value?.length ? `${value.length} selected` : placeholder || 'Select...'
        )
      );
    },
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement(View, { testID: props.testID || 'datetime-picker', ...props }),
  };
});

// ============================================================================
// Alert mock (must be after other RN mocks)
// ============================================================================
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// The mock above doesn't automatically flow to `import { Alert } from 'react-native'`
// because react-native exposes Alert as a getter that returns undefined in test env.
// Override the getter with a value property pointing to our mock.
Object.defineProperty(require('react-native'), 'Alert', {
  configurable: true,
  writable: true,
  value: require('react-native/Libraries/Alert/Alert'),
});

// ============================================================================
// React Navigation mocks
// ============================================================================
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn().mockReturnValue({
    setOptions: jest.fn(),
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
}));

// ============================================================================
// Silence noisy warnings in test output
// ============================================================================
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('componentWillReceiveProps') ||
    msg.includes('componentWillMount') ||
    msg.includes('Require cycle')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
