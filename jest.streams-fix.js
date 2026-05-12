// Fix for Expo SDK 55 streams polyfill conflicting with axios fetch adapter in tests.
// The expo/virtual/streams polyfill's ReadableStream.cancel() throws when a reader exists,
// which conflicts with axios's fetch adapter probe during module load.
// Solution: Remove global fetch so axios falls back to XMLHttpRequest adapter in tests.

delete globalThis.fetch;
delete globalThis.Request;
delete globalThis.Response;
delete globalThis.Headers;
