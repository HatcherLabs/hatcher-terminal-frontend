"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface DepositQRProps {
  publicKey: string;
}

export function DepositQR({ publicKey }: DepositQRProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(publicKey, {
      width: 200,
      margin: 2,
      color: { dark: "#e8e8e8", light: "#111118" },
    }).then(setQrUrl);
  }, [publicKey]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {qrUrl && (
        <img src={qrUrl} alt="Deposit QR Code" className="rounded-lg" width={200} height={200} />
      )}
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 max-w-full" style={{ background: "#04060b", border: "1px solid #1a1f2e" }}>
        <p className="font-mono text-xs truncate" style={{ color: "#9ca3b8" }}>
          {publicKey}
        </p>
        <button
          onClick={copyAddress}
          className="shrink-0 text-xs hover:brightness-110 transition-colors"
          style={{ color: "#00d672" }}
        >
          {copied ? "\u2713" : "COPY"}
        </button>
      </div>
    </div>
  );
}
