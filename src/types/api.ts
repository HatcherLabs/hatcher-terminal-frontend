export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SwipeRequest {
  mintAddress: string;
  direction: "left" | "right";
}

export interface SwipeResponse {
  status: "passed" | "buy_ready";
  unsignedTx?: string; // base64
}

export interface TxSubmitRequest {
  signedTx: string; // base64
  positionType: "buy" | "sell";
  mintAddress: string;
}

export interface TxSubmitResponse {
  jobId: string;
  status: "queued";
}

export interface TxStatusResponse {
  status: "pending" | "submitted" | "confirmed" | "failed";
  txHash?: string;
  error?: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  email?: string;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
}
