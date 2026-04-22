'use client';

type UserInfoProps = {
  displayName: string | null;
  onLogout: () => void;
  isLoggingOut?: boolean;
  onViewProfile?: () => void;
};

export default function UserInfo({
  displayName,
  onLogout,
  isLoggingOut = false,
  onViewProfile,
}: UserInfoProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium uppercase text-gray-500">Signed in as</p>
        <p className="text-sm font-semibold truncate">{displayName ?? 'Unknown user'}</p>
      </div>
      {onViewProfile && (
        <button
          onClick={onViewProfile}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Edit Vehicle
        </button>
      )}
      <button
        onClick={onLogout}
        disabled={isLoggingOut}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
      >
        {isLoggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </div>
  );
}
