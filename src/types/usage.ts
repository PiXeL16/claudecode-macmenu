// ABOUTME: Type definitions and utilities for Claude Code usage data tracking
// ABOUTME: Includes token counting, cost calculation, and model pricing information

export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
}

export interface UsageEntry {
  timestamp: string;
  message_id?: string;
  request_id?: string;
  requestId?: string;
  uuid?: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  cost?: number;
  cost_usd?: number;
  sessionId?: string;
  cwd?: string;
  stop_reason?: string;
  responseText?: string;
}

export interface SessionBlock {
  start_time: Date;
  end_time: Date;
  token_counts: TokenCounts;
  cost_usd: number;
  message_count: number;
  model_usage: { [model: string]: TokenCounts };
}

export interface BurnRate {
  tokens_per_minute: number;
  cost_per_hour: number;
}

export interface UsageStats {
  // Session stats
  sessionsToday: number;
  totalSessions: number;
  currentSessionDuration: number;

  // Token stats
  totalTokensToday: number;
  totalTokensAllTime: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;

  // Cost stats
  totalCostToday: number;
  totalCostAllTime: number;

  // Current session
  currentSessionTokens: number;
  currentSessionCost: number;
  currentBurnRate: BurnRate;

  // Messages
  messagesCount: number;
  messagesToday: number;

  // Model usage
  modelBreakdown: { [model: string]: TokenCounts };
}

// Model pricing per million tokens
export interface ModelPricing {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
}

export const MODEL_PRICING: { [key: string]: ModelPricing } = {
  'claude-3-opus': {
    input: 15.0,
    output: 75.0,
    cache_creation: 18.75,
    cache_read: 1.50
  },
  'claude-3-sonnet': {
    input: 3.0,
    output: 15.0,
    cache_creation: 3.75,
    cache_read: 0.30
  },
  'claude-3-5-sonnet': {
    input: 3.0,
    output: 15.0,
    cache_creation: 3.75,
    cache_read: 0.30
  },
  'claude-sonnet-4': {
    input: 3.0,
    output: 15.0,
    cache_creation: 3.75,
    cache_read: 0.30
  },
  'claude-sonnet-4-5': {
    input: 3.0,
    output: 15.0,
    cache_creation: 3.75,
    cache_read: 0.30
  },
  'claude-3-haiku': {
    input: 0.25,
    output: 1.25,
    cache_creation: 0.30,
    cache_read: 0.03
  }
};

export function normalizeModelName(model: string): string {
  const normalized = model.toLowerCase();

  // Map various model names to standard keys
  if (normalized.includes('opus')) return 'claude-3-opus';
  if (normalized.includes('sonnet')) {
    // Check for Sonnet 4.5 variants
    if (normalized.includes('4.5') || normalized.includes('4-5')) {
      return 'claude-sonnet-4-5';
    }
    // Check for Sonnet 4 variants
    if (normalized.includes('sonnet-4') || normalized.includes('sonnet_4') ||
        (normalized.includes('4') && !normalized.includes('3'))) {
      return 'claude-sonnet-4';
    }
    // Check for Sonnet 3.5 variants
    if (normalized.includes('3.5') || normalized.includes('3-5')) {
      return 'claude-3-5-sonnet';
    }
    return 'claude-3-sonnet';
  }
  if (normalized.includes('haiku')) return 'claude-3-haiku';

  return normalized;
}

export function calculateCost(tokens: TokenCounts, model: string): number {
  const modelKey = normalizeModelName(model);
  const pricing = MODEL_PRICING[modelKey] || MODEL_PRICING['claude-3-5-sonnet'];

  const inputCost = (tokens.input_tokens / 1_000_000) * pricing.input;
  const outputCost = (tokens.output_tokens / 1_000_000) * pricing.output;
  const cacheCost = ((tokens.cache_creation_tokens || 0) / 1_000_000) * pricing.cache_creation;
  const cacheReadCost = ((tokens.cache_read_tokens || 0) / 1_000_000) * pricing.cache_read;

  return inputCost + outputCost + cacheCost + cacheReadCost;
}

export function getTotalTokens(tokens: TokenCounts): number {
  return tokens.input_tokens +
         tokens.output_tokens +
         (tokens.cache_creation_tokens || 0) +
         (tokens.cache_read_tokens || 0);
}
