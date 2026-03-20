import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-4 select-none" aria-hidden="true">
        404
      </div>

      <h1 className="text-lg font-bold mb-2" style={{ color: "#eef0f6" }}>
        Page not found
      </h1>
      <p className="text-sm mb-1 max-w-[300px] leading-relaxed" style={{ color: "#5c6380" }}>
        Looks like this token rugged before we could load the page.
      </p>
      <p className="text-xs mb-6" style={{ color: "#363d54" }}>
        The page you are looking for does not exist.
      </p>

      <Link
        href="/swipe"
        className="px-5 py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        style={{ background: "#00d672", color: "#04060b" }}
      >
        Back to Swipe
      </Link>
    </div>
  );
}
