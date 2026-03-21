"use client";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className = "" }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "#5c6380",
        textDecoration: "none",
        transition: "color 150ms ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "#8890a4";
        el.style.textShadow = "0 0 6px rgba(34,197,94,0.3)";
        const icon = el.querySelector("svg") as SVGElement | null;
        if (icon) icon.style.filter = "drop-shadow(0 0 3px currentColor)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "#5c6380";
        el.style.textShadow = "none";
        const icon = el.querySelector("svg") as SVGElement | null;
        if (icon) icon.style.filter = "none";
      }}
    >
      {children}
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}
