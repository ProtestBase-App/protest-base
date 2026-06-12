// Force axios onto its XMLHttpRequest adapter in tests by removing global fetch
// (paired with the global.ReadableStream deletion in jest.setup.js, which stops
// axios preferring the fetch adapter). Originally added on SDK 55, where the
// expo/virtual/streams ReadableStream polyfill threw during axios's adapter probe.
//
// SDK 56 note: expo's winter runtime (loaded when any suite imports the `expo`
// package) asserts `globalThis.Headers` exists before lazily installing
// expo/fetch as the global fetch — so Headers must NOT be deleted here. Node's
// native Headers satisfies the assertion; the lazy expo/fetch global is never
// evaluated because axios stays on XHR.

delete globalThis.fetch;
delete globalThis.Request;
delete globalThis.Response;
