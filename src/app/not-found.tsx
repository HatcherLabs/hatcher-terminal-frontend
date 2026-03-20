import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
      style={{ background: "#04060b" }}
    >
      {/* Glitch-style 404 */}
      <div
        className="font-mono font-black select-none mb-4"
        style={{
          fontSize: 96,
          color: "#f23645",
          textShadow: "2px 2px 0 #00d672, -2px -2px 0 #3b82f6",
          letterSpacing: "0.1em",
          lineHeight: 1,
        }}
      >
        404
      </div>

      {/* Egg icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(242,54,69,0.08)", border: "1px solid rgba(242,54,69,0.15)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f23645" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c4.418 0 8-4.477 8-10S16.418 2 12 2 4 6.477 4 12s3.582 10 8 10z" />
          <path d="M9 13s1.5 2 3 2 3-2 3-2" />
          <circle cx="9.5" cy="10" r="0.5" fill="#f23645" />
          <circle cx="14.5" cy="10" r="0.5" fill="#f23645" />
        </svg>
      </div>

      <h1
        className="text-lg font-bold mb-2"
        style={{ color: "#eef0f6" }}
      >
        This page got rugged
      </h1>
      <p
        className="text-sm mb-1 max-w-[320px] leading-relaxed"
        style={{ color: "#5c6380" }}
      >
        Nothing to see here. The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <p
        className="text-xs mb-8 font-mono"
        style={{ color: "#363d54" }}
      >
        Error: PAGE_NOT_FOUND
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/swipe"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all no-underline"
          style={{
            background: "linear-gradient(135deg, #00d672 0%, #00b060 100%)",
            color: "#04060b",
            boxShadow: "0 0 16px rgba(0,214,114,0.2)",
          }}
        >
          Back to Hatcher
        </Link>
        <Link
          href="/explore"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all no-underline"
          style={{
            background: "#10131c",
            color: "#9ca3b8",
            border: "1px solid #1a1f2e",
          }}
        >
          Explore Tokens
        </Link>
      </div>
    </div>
  );
}
