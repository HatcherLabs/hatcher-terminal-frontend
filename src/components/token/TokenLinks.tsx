"use client";

interface TokenLinksProps {
  mintAddress: string;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
}

export function TokenLinks({ mintAddress, twitter, telegram, website }: TokenLinksProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Socials row */}
      {(twitter || telegram || website) && (
        <div className="flex items-center justify-center gap-2">
          {twitter && (
            <a
              href={twitter}
              target="_blank"
              rel="noopener noreferrer"
              title="Twitter / X"
              className="flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1DA1F2"; e.currentTarget.style.borderColor = "rgba(29,161,242,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.borderColor = "#1c2030"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter
            </a>
          )}
          {telegram && (
            <a
              href={telegram.startsWith("http") ? telegram : `https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Telegram"
              className="flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#229ED9"; e.currentTarget.style.borderColor = "rgba(34,158,217,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.borderColor = "#1c2030"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1.5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </a>
          )}
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Website"
              className="flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#22c55e"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.borderColor = "#1c2030"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Web
            </a>
          )}
        </div>
      )}
      {/* Platform links row */}
      <div className="flex items-center justify-center gap-2">
        {[
          { label: "PF", title: "Pump.fun", url: `https://pump.fun/coin/${mintAddress}`, hoverColor: "#22c55e" },
          { label: "SS", title: "Solscan", url: `https://solscan.io/token/${mintAddress}`, hoverColor: "#3b82f6" },
          { label: "BE", title: "Birdeye", url: `https://birdeye.so/token/${mintAddress}?chain=solana`, hoverColor: "#f59e0b" },
          { label: "DS", title: "DexScreener", url: `https://dexscreener.com/solana/${mintAddress}`, hoverColor: "#22c55e" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.title}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold tracking-wider transition-colors"
            style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = link.hoverColor; e.currentTarget.style.borderColor = `${link.hoverColor}4d`; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.borderColor = "#1c2030"; }}
            aria-label={`View on ${link.title}`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
