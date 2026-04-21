'use client';

import { useState } from 'react';
import RegisterForm from './RegisterForm';

type View = 'default' | 'register';

export default function LeftPanel(): React.JSX.Element {
  const [view, setView] = useState<View>('default');

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
      {view === 'register' ? (
        <RegisterForm onSuccess={() => setView('default')} />
      ) : (
        <div className="flex flex-col gap-3">
          <button
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={() => setView('register')}
          >
            Register
          </button>
          <button className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
            Log In
          </button>
        </div>
      )}
    </aside>
  );
}
