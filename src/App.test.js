import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders the game title', () => {
  render(<App />);
  expect(screen.getByText(/Phonologic Memory Game/i)).toBeInTheDocument();
});

test('renders generate sequence button', () => {
  render(<App />);
  expect(screen.getByText(/Generate Sequence/i)).toBeInTheDocument();
});

test('clicking generate sequence shows timer', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Generate Sequence/i));
  expect(screen.getByText(/s$/)).toBeInTheDocument(); // timer text like "10s"
});

test('score starts at zero', () => {
  render(<App />);
  expect(screen.getByText(/Score/i)).toBeInTheDocument();
  expect(screen.getByText('0 pts')).toBeInTheDocument();
});
