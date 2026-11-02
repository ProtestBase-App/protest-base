import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { TemplateLaunchTile } from '@/components/TemplateTiles';
import type { ParsedEventTemplate } from '@/types/template.types';

const template = {
  $id: 'tpl-1',
  name: 'Monthly vigil',
  event_data: { categories: 'protest' },
} as unknown as ParsedEventTemplate;

function renderTile(description?: string) {
  return render(
    <TemplateLaunchTile
      template={{ ...template, description }}
      editedLabel=""
      onLaunch={jest.fn()}
      onOpenMenu={jest.fn()}
    />
  );
}

describe('TemplateLaunchTile', () => {
  it('shows the note under the name', () => {
    renderTile('First Sunday, at the town hall');

    expect(screen.getByText('First Sunday, at the town hall')).toBeTruthy();
  });

  it('keeps a long note to two lines', () => {
    renderTile('x'.repeat(200));

    expect(screen.getByText('x'.repeat(200)).props.numberOfLines).toBe(2);
  });

  it('reads the note with the name', () => {
    renderTile('First Sunday, at the town hall');

    expect(screen.getByLabelText('Monthly vigil. First Sunday, at the town hall')).toBeTruthy();
  });

  it.each([undefined, '', '   '])('has no note line for %j', (description) => {
    renderTile(description);

    expect(screen.getByLabelText('Monthly vigil')).toBeTruthy();
  });
});
