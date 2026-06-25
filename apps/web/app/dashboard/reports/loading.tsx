export default function ReportsLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-10 w-36 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-36 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 animate-pulse bg-gray-200">
            <div className="h-4 w-24 rounded bg-gray-300" />
            <div className="mt-2 h-8 w-16 rounded bg-gray-300" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow animate-pulse">
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="mt-3 h-64 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
