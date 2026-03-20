"use client";

import { useState } from "react";
import Image from "next/image";

interface TokenAvatarProps {
  mintAddress: string;
  imageUri?: string | null;
  size?: number;
  ticker?: string;
}

function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

export function TokenAvatar({ mintAddress, imageUri, size = 48, ticker }: TokenAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const color = hashToColor(mintAddress);
  const initials = ticker ? ticker.slice(0, 2).toUpperCase() : mintAddress.slice(0, 2);

  if (imageUri && !imgError) {
    return (
      <div
        className="relative rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={imageUri}
          alt={ticker || "token"}
          width={size}
          height={size}
          className="rounded-full object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.35,
        color: "#04060b",
      }}
      role="img"
      aria-label={`${ticker || "Token"} avatar`}
    >
      {initials}
    </div>
  );
}
