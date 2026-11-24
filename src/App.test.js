import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  // The map asks for its country shapes; leave that pending in tests.
  global.fetch = () => new Promise(() => {});
});

test('opens on the Timeline with a headline that says who is at work', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/at work|off right now/i);
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  // Each page names itself in the tab, and the headline is announced as it changes.
  expect(document.title).toBe('Timeline – Teamline');
  expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('aria-live', 'polite');
});
