// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('@/utils/networkError', () => ({
  isNetworkError: jest.fn(() => false),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/services/api';
import { isNetworkError } from '@/utils/networkError';
import { searchAddress, AddressSearchError } from '@/services/address.service';

const mockGet = api.get as jest.Mock;
const mockIsNetworkError = isNetworkError as jest.Mock;

const SUGGESTION = {
  street_address: 'Rue de la Loi 16',
  postal_code: '1000',
  city: 'Brussels',
  region: 'Brussels-Capital',
  country: 'belgium',
  lat: 50.8467,
  lng: 4.3625,
  label: 'Rue de la Loi 16, 1000, Brussels',
};

describe('searchAddress', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockIsNetworkError.mockReturnValue(false);
  });

  it('returns the suggestion array and passes q/country/lang as params', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [SUGGESTION] } });

    const result = await searchAddress('rue de la loi', 'be', 'fr');

    expect(result).toEqual([SUGGESTION]);
    expect(mockGet).toHaveBeenCalledWith(
      '/address/autocomplete',
      expect.objectContaining({
        params: { q: 'rue de la loi', country: 'be', lang: 'fr' },
      })
    );
  });

  it('omits lang from params when not provided', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });

    await searchAddress('grote markt', 'nl');

    const config = mockGet.mock.calls[0][1];
    expect(config.params).toEqual({ q: 'grote markt', country: 'nl' });
    expect('lang' in config.params).toBe(false);
  });

  it('includes postal_code in params when a postcode hint is provided', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [SUGGESTION] } });

    await searchAddress('avenue des casernes 52', 'be', 'fr', '1040');

    const config = mockGet.mock.calls[0][1];
    expect(config.params).toEqual({
      q: 'avenue des casernes 52',
      country: 'be',
      lang: 'fr',
      postal_code: '1040',
    });
  });

  it('omits postal_code from params when no hint is provided', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });

    await searchAddress('grote markt', 'nl', 'nl');

    const config = mockGet.mock.calls[0][1];
    expect('postal_code' in config.params).toBe(false);
  });

  it('forwards the abort signal to axios', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    const controller = new AbortController();

    await searchAddress('test', 'be', 'en', undefined, controller.signal);

    expect(mockGet.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('returns an empty array (not an error) on zero matches', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await expect(searchAddress('zzz', 'be')).resolves.toEqual([]);
  });

  it('throws a generic AddressSearchError when success is false', async () => {
    mockGet.mockResolvedValue({ data: { success: false, data: [] } });
    await expect(searchAddress('x', 'be')).rejects.toMatchObject({
      name: 'AddressSearchError',
      kind: 'generic',
    });
  });

  it('classifies a 503 as "unavailable"', async () => {
    mockGet.mockRejectedValue({
      response: { status: 503, data: { code: 'GEOCODING_UNAVAILABLE' } },
    });
    await expect(searchAddress('x', 'be')).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('classifies the interceptor-transformed rate-limit error (code, no response) as "rate_limited"', async () => {
    // api.ts rewrites 429 into an error with `.code` and NO `.response`.
    mockGet.mockRejectedValue({ code: 'RATE_LIMIT_EXCEEDED', isRateLimited: true });
    await expect(searchAddress('x', 'be')).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('classifies a network/offline error as "unavailable"', async () => {
    mockIsNetworkError.mockReturnValue(true);
    mockGet.mockRejectedValue({ message: 'Network Error' });
    await expect(searchAddress('x', 'be')).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('classifies an unexpected error as "generic"', async () => {
    mockGet.mockRejectedValue({ response: { status: 400, data: { error: 'bad q' } } });
    await expect(searchAddress('x', 'be')).rejects.toMatchObject({ kind: 'generic' });
  });

  it('re-throws a cancellation untouched (not wrapped in AddressSearchError)', async () => {
    const cancel = { code: 'ERR_CANCELED', name: 'CanceledError' };
    mockGet.mockRejectedValue(cancel);
    await expect(searchAddress('x', 'be')).rejects.toBe(cancel);
    await expect(searchAddress('x', 'be')).rejects.not.toBeInstanceOf(AddressSearchError);
  });
});
