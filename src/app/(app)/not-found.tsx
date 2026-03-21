import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="animated-grid" />

      <div
        className="text-5xl font-mono font-black mb-4 select-none"
        aria-hidden="true"
        style={{
          color: "#22c55e",
          textShadow: "0 0 20px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.1)",
        }}
      >
        404
      </div>

      <h1 className="text-lg font-bold mb-2" style={{ color: "#f0f2f7" }}>
        Page not found
      </h1>
      <p className="text-sm font-mono mb-1 max-w-[300px] leading-relaxed" style={{ color: "#5c6380" }}>
        Looks like this token rugged before we could load the page.
      </p>
      <p className="text-xs font-mono mb-6" style={{ color: "#444c60" }}>
        The page you are looking for does not exist.
      </p>

      <Link
        href="/swipe"
        className="px-5 py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        style={{
          background: "#22c55e",
          color: "#06080e",
          boxShadow: "0 0 12px rgba(34,197,94,0.2)",
        }}
      >
        Back to Swipe
      </Link>
    </div>
  );
}
