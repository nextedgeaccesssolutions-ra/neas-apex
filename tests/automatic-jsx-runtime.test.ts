import { describe, expect, it } from 'vitest';
import AutomaticJsxFixture from './fixtures/automatic-jsx-fixture';

describe('Vitest automatic JSX transform', () => {
  it('transforms TSX without an explicit React namespace import', () => {
    const element = AutomaticJsxFixture();

    expect(element.type).toBe('span');
    expect(element.props['data-runtime']).toBe('automatic');
    expect(element.props.children).toBe('NEAS APEX');
  });
});
