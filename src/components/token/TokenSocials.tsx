"use client";

interface TokenSocialsProps {
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
  mintAddress: string;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function TokenSocials({
  twitter,
  telegram,
  website,
  mintAddress,
}: TokenSocialsProps) {
  const twitterUrl = twitter || null;
  const telegramUrl = telegram
    ? telegram.startsWith("http")
      ? telegram
      : `https://t.me/${telegram}`
    : null;
  const websiteUrl = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {/* Twitter / X */}
      {twitterUrl ? (
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Twitter / X"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            backgroundColor: "rgba(29, 161, 242, 0.1)",
            color: "#1DA1F2",
            fontFamily: "monospace",
            fontSize: 9,
            textDecoration: "none",
            lineHeight: 1,
            transition: "background-color 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(29, 161, 242, 0.25)";
            e.currentTarget.style.color = "#4db5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(29, 161, 242, 0.1)";
            e.currentTarget.style.color = "#1DA1F2";
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </a>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            color: "#5c6380",
            fontFamily: "monospace",
            fontSize: 9,
            opacity: 0.5,
            lineHeight: 1,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </span>
      )}

      {/* Telegram */}
      {telegramUrl ? (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            backgroundColor: "rgba(34, 158, 217, 0.1)",
            color: "#229ED9",
            fontFamily: "monospace",
            fontSize: 9,
            textDecoration: "none",
            lineHeight: 1,
            transition: "background-color 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(34, 158, 217, 0.25)";
            e.currentTarget.style.color = "#50b8e8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(34, 158, 217, 0.1)";
            e.currentTarget.style.color = "#229ED9";
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          TG
        </a>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            color: "#5c6380",
            fontFamily: "monospace",
            fontSize: 9,
            opacity: 0.5,
            lineHeight: 1,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          TG
        </span>
      )}

      {/* Website */}
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={websiteUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            color: "#4CAF50",
            fontFamily: "monospace",
            fontSize: 9,
            textDecoration: "none",
            lineHeight: 1,
            transition: "background-color 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(76, 175, 80, 0.25)";
            e.currentTarget.style.color = "#66BB6A";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
            e.currentTarget.style.color = "#4CAF50";
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {extractDomain(website!)}
        </a>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            height: 20,
            padding: "0 6px",
            borderRadius: 4,
            color: "#5c6380",
            fontFamily: "monospace",
            fontSize: 9,
            opacity: 0.5,
            lineHeight: 1,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Web
        </span>
      )}

      {/* Pump.fun - always available */}
      <a
        href={`https://pump.fun/coin/${mintAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Pump.fun"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          height: 20,
          padding: "0 6px",
          borderRadius: 4,
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          color: "#8B5CF6",
          fontFamily: "monospace",
          fontSize: 9,
          textDecoration: "none",
          lineHeight: 1,
          transition: "background-color 150ms, color 150ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.25)";
          e.currentTarget.style.color = "#A78BFA";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.1)";
          e.currentTarget.style.color = "#8B5CF6";
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
        PF
      </a>

      {/* Solscan - always available */}
      <a
        href={`https://solscan.io/token/${mintAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Solscan"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          height: 20,
          padding: "0 6px",
          borderRadius: 4,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          color: "#3B82F6",
          fontFamily: "monospace",
          fontSize: 9,
          textDecoration: "none",
          lineHeight: 1,
          transition: "background-color 150ms, color 150ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.25)";
          e.currentTarget.style.color = "#60A5FA";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
          e.currentTarget.style.color = "#3B82F6";
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        SS
      </a>
    </div>
  );
}
