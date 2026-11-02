import { File } from 'expo-file-system';

import { keepExistingImages } from '@/utils/localImages';

jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn() } }));

const picked = (uri: string) => ({ uri, name: 'a.jpg', type: 'image/jpeg' });

describe('keepExistingImages', () => {
  const setExisting = (exists: (uri: string) => boolean) => {
    (File as unknown as jest.Mock).mockImplementation((uri: string) => ({ exists: exists(uri) }));
  };

  it('keeps hosted images without looking', () => {
    setExisting(() => false);

    expect(keepExistingImages(['https://example.com/a.jpg'])).toEqual([
      'https://example.com/a.jpg',
    ]);
  });

  it('drops a picked file the system cleared', () => {
    setExisting((uri) => uri === 'file:///kept.jpg');
    const kept = picked('file:///kept.jpg');

    expect(keepExistingImages([kept, picked('file:///gone.jpg')])).toEqual([kept]);
  });

  it('keeps a file it cannot check, rather than losing it', () => {
    (File as unknown as jest.Mock).mockImplementation(() => {
      throw new Error('bad uri');
    });
    const image = picked('weird:uri');

    expect(keepExistingImages([image])).toEqual([image]);
  });
});
