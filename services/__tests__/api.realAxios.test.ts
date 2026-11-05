// api.test.ts mocks axios and hands the interceptors plain objects. These tests run the real
// axios instance against a fake adapter, so what the interceptors read off a failed request is
// a real config with AxiosHeaders, as in the app.

import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import api, {
  markSessionActive,
  setTokenExpirationCallback,
  type SessionEndReason,
} from '@/services/api';
import { SECURE_STORE_KEYS } from '@/constants/StorageConfig';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('expo-constants', () => {
  const Constants = {
    expoConfig: { extra: { apiBaseUrl: 'https://api.example.com', apiKey: 'test-api-key' } },
  };
  return { __esModule: true, default: Constants, ...Constants };
});

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/utils/appVersion', () => ({
  __esModule: true,
  getInstalledAppVersion: jest.fn(() => '1.2.3'),
}));

const secureStore = jest.requireMock('expo-secure-store') as { __store: Map<string, string> };

const apiAdapter = api.defaults.adapter;
const plainAxiosAdapter = axios.defaults.adapter;

/** Answers like a server: a 2xx resolves, anything else rejects the way axios's `settle` does. */
function reply(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown
): Promise<AxiosResponse> {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response
    )
  );
}

function sentAuthorization(config: InternalAxiosRequestConfig): string {
  return String(config.headers.get('Authorization'));
}

async function seedSession(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, refreshToken);
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.SESSION_ID, 'session-1');
}

function nextSessionEnd(): Promise<SessionEndReason | undefined> {
  return new Promise((resolve) => setTokenExpirationCallback(resolve));
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('services/api.ts with real axios', () => {
  afterEach(() => {
    secureStore.__store.clear();
    api.defaults.adapter = apiAdapter;
    axios.defaults.adapter = plainAxiosAdapter;
    setTokenExpirationCallback(() => {});
    markSessionActive();
  });

  it('ends the session when a request sent with the token gets 403 ACCOUNT_DISABLED', async () => {
    await seedSession('access-1', 'refresh-1');
    const sent: string[] = [];
    api.defaults.adapter = (config) => {
      sent.push(sentAuthorization(config));
      return reply(config, 403, { success: false, code: 'ACCOUNT_DISABLED', error: 'Disabled' });
    };

    const ended = nextSessionEnd();
    const request = api.get('/organizer/events');
    const outcome = await Promise.race([
      ended.then((reason) => ({ ended: reason })),
      request.then(
        () => ({ settled: 'resolved' }),
        (error: AxiosError<{ code?: string }>) => ({ settled: error.response?.data?.code })
      ),
    ]);

    expect(outcome).toEqual({ ended: 'account_disabled' });
    expect(sent).toEqual(['Bearer access-1']);
    expect(secureStore.__store.size).toBe(0);

    const settled = jest.fn();
    request.then(settled, settled);
    await flush();
    expect(settled).not.toHaveBeenCalled();
  });

  it('passes 403 ACCOUNT_DISABLED to the caller when the request carried no token', async () => {
    const onSessionEnd = jest.fn();
    setTokenExpirationCallback(onSessionEnd);
    api.defaults.adapter = (config) =>
      reply(config, 403, { success: false, code: 'ACCOUNT_DISABLED', error: 'Disabled' });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 403, data: { code: 'ACCOUNT_DISABLED' } },
    });
    expect(onSessionEnd).not.toHaveBeenCalled();
  });

  it('refreshes an expired token and retries the request with the new one', async () => {
    await seedSession('access-1', 'refresh-1');
    const sent: string[] = [];
    api.defaults.adapter = (config) => {
      const authorization = sentAuthorization(config);
      sent.push(authorization);
      return authorization === 'Bearer access-2'
        ? reply(config, 200, { success: true, data: { events: [] } })
        : reply(config, 401, { success: false, code: 'TOKEN_EXPIRED' });
    };
    const refreshes: { url?: string; apiKey: unknown; body: unknown }[] = [];
    axios.defaults.adapter = (config) => {
      refreshes.push({
        url: config.url,
        apiKey: config.headers.get('x-api-key'),
        body: JSON.parse(String(config.data)),
      });
      return reply(config, 200, {
        success: true,
        data: { accessToken: 'access-2', refreshToken: 'refresh-2' },
      });
    };

    const response = await api.get('/organizer/events');

    expect(response.data).toEqual({ success: true, data: { events: [] } });
    expect(sent).toEqual(['Bearer access-1', 'Bearer access-2']);
    expect(refreshes).toEqual([
      {
        url: 'https://api.example.com/auth/token/refresh',
        apiKey: 'test-api-key',
        body: { refreshToken: 'refresh-1' },
      },
    ]);
    expect(secureStore.__store.get(SECURE_STORE_KEYS.ACCESS_TOKEN)).toBe('access-2');
    expect(secureStore.__store.get(SECURE_STORE_KEYS.REFRESH_TOKEN)).toBe('refresh-2');
  });

  it('retries with the stored token, without refreshing, when a refresh already replaced the one sent', async () => {
    await seedSession('access-1', 'refresh-1');
    const sent: string[] = [];
    api.defaults.adapter = async (config) => {
      const authorization = sentAuthorization(config);
      sent.push(authorization);
      if (authorization === 'Bearer access-1') {
        // Another request's refresh lands while this one is in flight.
        secureStore.__store.set(SECURE_STORE_KEYS.ACCESS_TOKEN, 'access-2');
        return reply(config, 401, { success: false, code: 'TOKEN_EXPIRED' });
      }
      return reply(config, 200, { success: true, data: { events: [] } });
    };
    const refresh: jest.MockedFunction<AxiosAdapter> = jest.fn();
    axios.defaults.adapter = refresh;

    await expect(api.get('/organizer/events')).resolves.toMatchObject({ status: 200 });
    expect(sent).toEqual(['Bearer access-1', 'Bearer access-2']);
    expect(refresh).not.toHaveBeenCalled();
  });
});
