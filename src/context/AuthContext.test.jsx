import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{user ? `hi ${user.email}` : 'anon'}</p>;
}

describe('AuthContext', () => {
  it('fetches /me on mount and exposes user', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/hi doc@x.com/)).toBeInTheDocument());
  });
});
