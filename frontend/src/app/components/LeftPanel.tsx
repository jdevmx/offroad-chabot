export default function LeftPanel(): React.JSX.Element {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <button className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          Register
        </button>
        <button className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          Log In
        </button>
      </div>
    </aside>
  );
}
