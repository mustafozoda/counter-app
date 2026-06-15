/* eslint-env jest */
// AsyncStorage is a native module; tests run against its official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// keyboard-controller wraps native views/event-emitters that don't exist under
// jest; use its official mock so any module importing it (e.g. the Screen UI)
// loads cleanly in tests.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
