# Hatcher Terminal Frontend

A real-time Solana token trading terminal built with Next.js. Features live price feeds, token discovery, portfolio tracking, and one-click trading — designed for speed and information density.

## Quick Start

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **Charts**: Lightweight Charts (TradingView)
- **Animations**: Framer Motion
- **Blockchain**: @solana/web3.js, TweetNaCl
- **Fonts**: DM Sans, JetBrains Mono

## Project Structure

```
src/
├── app/(app)/              # App routes (behind auth layout)
│   ├── explore/            # Token discovery with trending, filters, bubble map
│   ├── token/[mint]/       # Token detail page (chart, trades, security, trading)
│   ├── swipe/              # Tinder-style token discovery
│   ├── wallet/             # Wallet management, deposit, withdraw
│   ├── watchlist/          # Saved tokens with price alerts
│   ├── alerts/             # Price alert management
│   ├── orders/             # Open orders
│   ├── compare/            # Side-by-side token comparison
│   ├── smart-money/        # Whale wallet tracking
│   ├── copy-trade/         # Copy trading setup
│   ├── graveyard/          # Dead/rugged token history
│   ├── matches/            # Swipe matches
│   └── settings/           # User preferences
├── components/
│   ├── explore/            # TrendingBar, BubbleMap, NewTokenBanner
│   ├── layout/             # TerminalLayout, TopBar, Sidebar, PositionsBar
│   ├── positions/          # PositionCard, PortfolioStats, PnLCalendar, TradeHistory
│   ├── providers/          # Context providers (Auth, Wallet, Watchlist, Notifications)
│   ├── swipe/              # SwipeCard, SwipeStack, SwipeFilters
│   ├── token/              # MiniChart, TokenHoverCard, SecuritySignals
│   ├── trade/              # TradePanel, QuickTrade, TxStatusTracker, MEVProtection
│   ├── ui/                 # Shared UI (CommandPalette, PriceTicker, AnimatedPrice, etc.)
│   ├── wallet/             # BalanceDisplay, DepositQR, WithdrawModal
│   └── onboarding/         # WelcomeModal
├── hooks/                  # Custom hooks
│   ├── useWebSocketSubscription.ts   # Channel-based WebSocket subscriptions
│   ├── useLiveTokenPrice.ts          # Real-time price feed per token
│   ├── useLiveTrades.ts              # Real-time trade feed
│   ├── useNewTokenAlert.ts           # New token detection via WS
│   ├── useWatchlistAlerts.ts         # Price movement alerts for watchlist
│   ├── usePositions.ts               # Portfolio positions
│   ├── useBalance.ts                 # Wallet balance
│   ├── useSolPrice.ts                # SOL/USD price
│   └── useKeyboardShortcuts.ts       # Global keyboard shortcuts
└── lib/
    ├── api.ts              # API client
    └── csv-export.ts       # CSV export utility
```

## Features

- **Explore**: Trending tokens, category filters, bubble map visualization, new token alerts
- **Token Detail**: TradingView chart, live trades, holder analysis, security signals, integrated trading
- **Swipe Discovery**: Tinder-style token swiping with filters and session stats
- **Portfolio**: Live positions with P&L, trade history, P&L calendar, portfolio stats
- **Trading**: Quick trade panel, limit orders, auto-sell, MEV protection, transaction status tracking
- **Wallet**: SOL balance, deposit via QR, withdraw, private key import
- **Watchlist**: Save tokens, price movement alerts with configurable thresholds
- **Smart Money**: Track whale wallets and their trades
- **Copy Trade**: Follow and copy trades from top performers
- **Keyboard Shortcuts**: Command palette (Ctrl+K), global shortcuts for navigation

## Scripts

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=        # Backend API base URL
NEXT_PUBLIC_WS_URL=         # WebSocket server URL
```

## Development

- Desktop-first terminal layout with responsive mobile support
- Custom dark theme with hardcoded hex colors for consistency
- WebSocket-based real-time data (prices, trades, new tokens, alerts)
- All colors use inline styles with hex values (no Tailwind color tokens)
