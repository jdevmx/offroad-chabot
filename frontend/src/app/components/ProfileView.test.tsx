import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProfileView from './ProfileView';
import type { UserProfile } from '../services/auth.service';

// ---------------------------------------------------------------------------
// Fakes — no vi.fn/vi.mock
// ---------------------------------------------------------------------------

function makeProfile(overrides: Partial<UserProfile['vehicle']> = {}): UserProfile {
  return {
    uid: 'uid-1',
    username: 'trail_rider',
    displayName: 'Trail Rider',
    vehicle: {
      make: 'Toyota',
      model: '4Runner',
      year: 2022,
      modifications: ['lift kit', 'snorkel'],
      ...overrides,
    },
    preferences: { terrainTypes: ['rock'], experience: 'intermediate' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeGetProfile(result: UserProfile | Error) {
  return async (): Promise<UserProfile> => {
    if (result instanceof Error) throw result;
    return result;
  };
}

function makeUpdateVehicle(result: UserProfile | Error) {
  return async (_modifications: string[]): Promise<UserProfile> => {
    if (result instanceof Error) throw result;
    return result;
  };
}

function noOpBack(): void {}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfileView', () => {
  describe('loading state', () => {
    it('shows loading text while profile is being fetched', async () => {
      let resolveProfile: ((p: UserProfile) => void) | null = null;
      const pendingGet = (): Promise<UserProfile> =>
        new Promise((resolve) => {
          resolveProfile = resolve;
        });

      render(
        <ProfileView onBack={noOpBack} getProfile={pendingGet} updateVehicle={makeUpdateVehicle(makeProfile())} />
      );

      expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

      await act(async () => {
        resolveProfile!(makeProfile());
      });
    });
  });

  describe('profile display', () => {
    it('displays vehicle make, model, year after loading', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2022 Toyota 4Runner/i)).toBeInTheDocument();
      });
    });

    it('displays existing modifications as tags', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('lift kit')).toBeInTheDocument();
        expect(screen.getByText('snorkel')).toBeInTheDocument();
      });
    });

    it('shows error message when profile fetch fails', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(new Error('Network error'))}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
      });
    });
  });

  describe('modification editing', () => {
    it('removes a modification when its remove button is clicked', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('lift kit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /remove lift kit/i }));

      expect(screen.queryByText('lift kit')).not.toBeInTheDocument();
    });

    it('adds a new modification when Add is clicked', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/new modification/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/new modification/i), {
        target: { value: 'winch' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText('winch')).toBeInTheDocument();
    });

    it('adds a modification when Enter is pressed in the input', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/new modification/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/new modification/i), {
        target: { value: 'ARB bumper' },
      });
      fireEvent.keyDown(screen.getByLabelText(/new modification/i), { key: 'Enter' });

      expect(screen.getByText('ARB bumper')).toBeInTheDocument();
    });

    it('does not add a duplicate modification', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('snorkel')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/new modification/i), {
        target: { value: 'snorkel' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getAllByText('snorkel')).toHaveLength(1);
    });
  });

  describe('saving', () => {
    it('calls updateVehicle with current modifications when Save is clicked', async () => {
      let capturedMods: string[] | null = null;
      const fakeUpdate = async (mods: string[]): Promise<UserProfile> => {
        capturedMods = mods;
        return makeProfile({ modifications: mods });
      };

      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={fakeUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });

      await waitFor(() => {
        expect(capturedMods).toEqual(['lift kit', 'snorkel']);
      });
    });

    it('shows success message after a successful save', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/saved successfully/i);
      });
    });

    it('shows error message when save fails', async () => {
      render(
        <ProfileView
          onBack={noOpBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(new Error('Save error'))}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/save error/i);
      });
    });
  });

  describe('navigation', () => {
    it('calls onBack when Back button is clicked', async () => {
      let backCalled = false;
      const fakeBack = (): void => {
        backCalled = true;
      };

      render(
        <ProfileView
          onBack={fakeBack}
          getProfile={makeGetProfile(makeProfile())}
          updateVehicle={makeUpdateVehicle(makeProfile())}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      expect(backCalled).toBe(true);
    });
  });
});
