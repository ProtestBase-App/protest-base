jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import api from '@/services/api';
import {
  followOrganizationOnServer,
  likeEventOnServer,
  saveEventOnServer,
  unfollowOrganizationOnServer,
  unlikeEventOnServer,
  unsaveEventOnServer,
} from '@/services/engagement.service';

const mockApi = api as jest.Mocked<typeof api>;

type Case = {
  name: string;
  call: (id: string) => Promise<number>;
  method: 'post' | 'delete';
  url: string;
  countKey: string;
  failure: string;
};

const cases: Case[] = [
  {
    name: 'saveEventOnServer',
    call: saveEventOnServer,
    method: 'post',
    url: '/events/id-1/save',
    countKey: 'save_count',
    failure: 'Failed to save event',
  },
  {
    name: 'unsaveEventOnServer',
    call: unsaveEventOnServer,
    method: 'delete',
    url: '/events/id-1/save',
    countKey: 'save_count',
    failure: 'Failed to unsave event',
  },
  {
    name: 'likeEventOnServer',
    call: likeEventOnServer,
    method: 'post',
    url: '/events/id-1/like',
    countKey: 'like_count',
    failure: 'Failed to like event',
  },
  {
    name: 'unlikeEventOnServer',
    call: unlikeEventOnServer,
    method: 'delete',
    url: '/events/id-1/like',
    countKey: 'like_count',
    failure: 'Failed to unlike event',
  },
  {
    name: 'followOrganizationOnServer',
    call: followOrganizationOnServer,
    method: 'post',
    url: '/organizations/id-1/follow',
    countKey: 'follower_count',
    failure: 'Failed to follow organization',
  },
  {
    name: 'unfollowOrganizationOnServer',
    call: unfollowOrganizationOnServer,
    method: 'delete',
    url: '/organizations/id-1/follow',
    countKey: 'follower_count',
    failure: 'Failed to unfollow organization',
  },
];

describe.each(cases)('$name', ({ call, method, url, countKey, failure }) => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the count from the server', async () => {
    mockApi[method].mockResolvedValue({ data: { success: true, data: { [countKey]: 7 } } });

    await expect(call('id-1')).resolves.toBe(7);
    expect(mockApi[method]).toHaveBeenCalledWith(url);
  });

  it('throws when the server reports no success', async () => {
    mockApi[method].mockResolvedValue({ data: { success: false, data: {} } });

    await expect(call('id-1')).rejects.toThrow(failure);
  });

  it.each([
    [401, 'Please log in to perform this action'],
    [403, 'You do not have permission to perform this action'],
    [404, 'Resource not found'],
  ])('maps HTTP %i to a message', async (status, message) => {
    mockApi[method].mockRejectedValue({ response: { status } });

    await expect(call('id-1')).rejects.toThrow(message);
  });

  it('uses the server error text for other statuses', async () => {
    mockApi[method].mockRejectedValue({ response: { status: 500, data: { error: 'Boom' } } });

    await expect(call('id-1')).rejects.toThrow('Boom');
  });

  it('falls back to the action name when the error has no message', async () => {
    mockApi[method].mockRejectedValue({});

    await expect(call('id-1')).rejects.toThrow(failure);
  });
});
