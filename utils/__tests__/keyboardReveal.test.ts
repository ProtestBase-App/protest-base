import {
  DROPDOWN_HEADROOM,
  DROPDOWN_LABEL_ROOM,
  getDropdownHeadroom,
  getRevealScrollOffset,
} from '@/utils/keyboardReveal';

describe('getRevealScrollOffset', () => {
  it('keeps the current offset when the band is already in view', () => {
    expect(getRevealScrollOffset(100, 400, 150, 450)).toBe(100);
  });

  it('scrolls down just far enough to fit a band below the viewport', () => {
    expect(getRevealScrollOffset(0, 400, 300, 600)).toBe(200);
  });

  it('scrolls up to a band above the viewport', () => {
    expect(getRevealScrollOffset(500, 400, 200, 350)).toBe(200);
  });

  it('aligns a band taller than the viewport to its top so the input stays in view', () => {
    expect(getRevealScrollOffset(0, 300, 500, 1000)).toBe(500);
  });

  it('never returns a negative offset', () => {
    expect(getRevealScrollOffset(50, 400, -48, 200)).toBe(0);
  });
});

describe('getDropdownHeadroom', () => {
  it('reserves the full headroom when the screen has room for it', () => {
    expect(
      getDropdownHeadroom({ keyboardTop: 900, viewportTop: 50, bottomInset: 12, inputHeight: 40 })
    ).toBe(DROPDOWN_HEADROOM);
  });

  it('shrinks the headroom so the input and its label stay in view', () => {
    expect(
      getDropdownHeadroom({ keyboardTop: 500, viewportTop: 100, bottomInset: 92, inputHeight: 40 })
    ).toBe(500 - 92 - 40 - 100 - DROPDOWN_LABEL_ROOM);
  });

  it('reserves nothing when only the input itself fits', () => {
    expect(
      getDropdownHeadroom({ keyboardTop: 250, viewportTop: 100, bottomInset: 92, inputHeight: 40 })
    ).toBe(0);
  });
});
