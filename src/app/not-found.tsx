import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-bg-primary">
      <div className="text-6xl font-bold text-text-primary mb-2 select-none">
        404
      </div>

      <h1 className="text-lg font-bold text-text-primary mb-2">
        Page not found
      </h1>
      <p className="text-sm text-text-muted mb-1 max-w-[300px] leading-relaxed">
        This page got rugged. Nothing to see here.
      </p>
      <p className="text-xs text-text-faint mb-6">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/swipe"
        className="px-5 py-2.5 rounded-lg bg-green text-bg-primary text-sm font-semibold hover:brightness-110 transition-all"
      >
        Back to Hatcher
      </Link>
    </div>
  );
}
