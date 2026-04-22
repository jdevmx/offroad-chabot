'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getProfile as defaultGetProfile,
  updateVehicle as defaultUpdateVehicle,
  type UserProfile,
} from '../services/auth.service';

type ProfileViewProps = {
  onBack: () => void;
  getProfile?: () => Promise<UserProfile>;
  updateVehicle?: (modifications: string[]) => Promise<UserProfile>;
};

export default function ProfileView({
  onBack,
  getProfile = defaultGetProfile,
  updateVehicle = defaultUpdateVehicle,
}: ProfileViewProps): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [modifications, setModifications] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setModifications(p.vehicle.modifications);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load profile');
      });
  }, [getProfile]);

  function addTag(): void {
    const tag = newTag.trim();
    if (!tag || modifications.includes(tag)) return;
    setModifications([...modifications, tag]);
    setNewTag('');
    inputRef.current?.focus();
  }

  function removeTag(tag: string): void {
    setModifications(modifications.filter((m) => m !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSave(): Promise<void> {
    setSaveStatus('saving');
    setSaveError('');
    try {
      const updated = await updateVehicle(modifications);
      setProfile(updated);
      setSaveStatus('saved');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaveStatus('error');
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={onBack} className="text-left text-sm text-gray-500 hover:underline">
          ← Back
        </button>
        <p role="alert" className="text-sm text-red-600">
          {loadError}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={onBack} className="text-left text-sm text-gray-500 hover:underline">
          ← Back
        </button>
        <p className="text-sm text-gray-500">Loading profile…</p>
      </div>
    );
  }

  const { make, model, year, trim } = profile.vehicle;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="text-left text-sm text-gray-500 hover:underline">
        ← Back
      </button>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Vehicle</p>
        <p className="text-sm font-semibold">
          {year} {make} {model}
          {trim ? ` — ${trim}` : ''}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-gray-500 mb-1">Modifications</p>
        <ul className="flex flex-wrap gap-1 mb-2">
          {modifications.map((mod) => (
            <li
              key={mod}
              className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs"
            >
              {mod}
              <button
                onClick={() => removeTag(mod)}
                aria-label={`Remove ${mod}`}
                className="text-gray-400 hover:text-gray-700 leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add modification…"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
            aria-label="New modification"
          />
          <button
            onClick={addTag}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <p role="status" className="text-xs text-green-600">
          Saved successfully
        </p>
      )}
      {saveStatus === 'error' && (
        <p role="alert" className="text-xs text-red-600">
          {saveError}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {saveStatus === 'saving' ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
