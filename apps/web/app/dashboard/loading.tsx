export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-6 shadow animate-pulse"
            >
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="mt-4 h-10 w-20 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
