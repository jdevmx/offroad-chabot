'use client';

import { useState, useEffect, useRef } from 'react';
import {
  checkUsername as defaultCheckUsername,
  register as defaultRegister,
  type RegisterPayload,
} from '../services/auth.service';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

type Experience = 'beginner' | 'intermediate' | 'expert';

const TERRAIN_OPTIONS = ['sand', 'mud', 'rock', 'trail', 'snow'] as const;

type RegisterFormProps = {
  onSuccess?: () => void;
  checkUsername?: (username: string) => Promise<{ available: boolean }>;
  register?: (payload: RegisterPayload) => Promise<{ token: string; userId: string; displayName: string }>;
};

type FormErrors = Partial<Record<string, string>>;

function validateForm(fields: {
  username: string;
  displayName: string;
  pin: string;
  make: string;
  model: string;
  year: string;
  experience: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!fields.username.trim()) errors.username = 'Username is required';
  if (!fields.displayName.trim()) errors.displayName = 'Display name is required';
  if (!fields.pin) {
    errors.pin = 'PIN is required';
  } else if (!/^\d{4}$/.test(fields.pin)) {
    errors.pin = 'PIN must be exactly 4 digits';
  }
  if (!fields.make.trim()) errors.make = 'Make is required';
  if (!fields.model.trim()) errors.model = 'Model is required';
  if (!fields.year.trim()) {
    errors.year = 'Year is required';
  } else if (isNaN(Number(fields.year)) || !Number.isInteger(Number(fields.year))) {
    errors.year = 'Year must be a valid number';
  }
  if (!fields.experience) errors.experience = 'Experience level is required';

  return errors;
}

export default function RegisterForm({
  onSuccess,
  checkUsername = defaultCheckUsername,
  register = defaultRegister,
}: RegisterFormProps): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [trim, setTrim] = useState('');
  const [modificationsText, setModificationsText] = useState('');
  const [terrainTypes, setTerrainTypes] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience | ''>('');

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!username.trim()) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    debounceRef.current = setTimeout(() => {
      checkUsername(username)
        .then((result) => {
          setUsernameStatus(result.available ? 'available' : 'taken');
        })
        .catch(() => {
          setUsernameStatus('idle');
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, checkUsername]);

  function handleTerrainChange(terrain: string): void {
    setTerrainTypes((prev) =>
      prev.includes(terrain) ? prev.filter((t) => t !== terrain) : [...prev, terrain]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateForm({ username, displayName, pin, make, model, year, experience });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const modifications = modificationsText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const payload: RegisterPayload = {
      username,
      displayName,
      pin,
      vehicle: {
        make,
        model,
        year: Number(year),
        ...(trim.trim() ? { trim: trim.trim() } : {}),
        modifications,
      },
      preferences: {
        terrainTypes,
        experience: experience as Experience,
      },
    };

    setSubmitting(true);
    try {
      await register(payload);
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function usernameStatusLabel(): string {
    if (usernameStatus === 'checking') return 'checking\u2026';
    if (usernameStatus === 'available') return '\u2713 available';
    if (usernameStatus === 'taken') return '\u2717 taken';
    return '';
  }

  function usernameStatusColor(): string {
    if (usernameStatus === 'available') return 'text-green-600';
    if (usernameStatus === 'taken') return 'text-red-600';
    return 'text-gray-500';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Create account</h2>

      {/* Account section */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium uppercase text-gray-500">Account</legend>

        <div>
          <label htmlFor="username" className="block text-sm">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            aria-describedby="username-status"
          />
          <span id="username-status" className={`text-xs ${usernameStatusColor()}`}>
            {usernameStatusLabel()}
          </span>
          {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          {errors.displayName && <p className="text-xs text-red-600">{errors.displayName}</p>}
        </div>

        <div>
          <label htmlFor="pin" className="block text-sm">
            PIN (4 digits)
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          {errors.pin && <p className="text-xs text-red-600">{errors.pin}</p>}
        </div>
      </fieldset>

      {/* Vehicle section */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium uppercase text-gray-500">Vehicle</legend>

        <div>
          <label htmlFor="make" className="block text-sm">
            Make
          </label>
          <input
            id="make"
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          {errors.make && <p className="text-xs text-red-600">{errors.make}</p>}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm">
            Model
          </label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          {errors.model && <p className="text-xs text-red-600">{errors.model}</p>}
        </div>

        <div>
          <label htmlFor="year" className="block text-sm">
            Year
          </label>
          <input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          {errors.year && <p className="text-xs text-red-600">{errors.year}</p>}
        </div>

        <div>
          <label htmlFor="trim" className="block text-sm">
            Trim (optional)
          </label>
          <input
            id="trim"
            type="text"
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label htmlFor="modifications" className="block text-sm">
            Modifications (comma-separated)
          </label>
          <input
            id="modifications"
            type="text"
            value={modificationsText}
            onChange={(e) => setModificationsText(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="lift kit, skid plate, lockers"
          />
        </div>
      </fieldset>

      {/* Preferences section */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium uppercase text-gray-500">Preferences</legend>

        <div>
          <span className="block text-sm">Terrain types</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {TERRAIN_OPTIONS.map((terrain) => (
              <label key={terrain} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  value={terrain}
                  checked={terrainTypes.includes(terrain)}
                  onChange={() => handleTerrainChange(terrain)}
                />
                {terrain}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="experience" className="block text-sm">
            Experience level
          </label>
          <select
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value as Experience | '')}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Select level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
          {errors.experience && <p className="text-xs text-red-600">{errors.experience}</p>}
        </div>
      </fieldset>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {submitting ? 'Creating account\u2026' : 'Create account'}
      </button>
    </form>
  );
}
