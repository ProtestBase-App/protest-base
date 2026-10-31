import { BackHandler } from 'react-native';

/**
 * Stands in for Android's back button, which the test runtime's iOS stub ignores.
 * Mirrors the real order: the newest listener runs first, and `true` stops the rest.
 */
export function spyOnBackHandler() {
  const listeners: Parameters<typeof BackHandler.addEventListener>[1][] = [];

  const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener);
    return {
      remove: () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      },
    };
  });

  return {
    /** Returns whether a listener handled the press. */
    pressBack: () =>
      [...listeners]
        .reverse()
        .some((listener) => listener({ type: 'hardwareBackPress', timeStamp: 0 }) === true),
    restore: () => spy.mockRestore(),
  };
}
