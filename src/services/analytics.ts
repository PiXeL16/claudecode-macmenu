// ABOUTME: Analytics service for tracking Claude Code usage statistics and metrics
// ABOUTME: Calculates tokens, costs, burn rates, and session data from usage log files
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { UsageReader } from './usageReader';
import {
  UsageEntry,
  UsageStats,
  TokenCounts,
  BurnRate,
  calculateCost,
  getTotalTokens
} from '../types/usage';

export class AnalyticsService {
  private usageReader: UsageReader;
  private cachedStats: UsageStats | null = null;
  private lastUpdate: number = 0;
  private updateInterval = 60000; // Update cache every 60 seconds
  private appStartTime: number;

  constructor() {
    this.usageReader = new UsageReader();
    this.appStartTime = Date.now();

    // Initial stats calculation
    this.refreshStats();
  }

  /**
   * Refresh statistics from Claude usage data
   */
  async refreshStats(): Promise<void> {
    try {
      // Get usage data from last 8 days (192 hours)
      const cutoffDate = new Date(Date.now() - 192 * 60 * 60 * 1000);
      const entries = await this.usageReader.readAllUsageData(cutoffDate);

      this.cachedStats = this.calculateStats(entries);
      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to refresh stats:', error);

      // Return empty stats if there's an error
      if (!this.cachedStats) {
        this.cachedStats = this.getEmptyStats();
      }
    }
  }

  /**
   * Calculate statistics from usage entries
   */
  private calculateStats(entries: UsageEntry[]): UsageStats {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Initialize counters
    let totalTokensAllTime = 0;
    let totalTokensToday = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheTokens = 0;
    let totalCostAllTime = 0;
    let totalCostToday = 0;
    let messagesCount = entries.length;
    let messagesToday = 0;

    const modelBreakdown: { [model: string]: TokenCounts } = {};
    const sessionBlocks: Set<string> = new Set();

    // Process each entry
    for (const entry of entries) {
      const entryDate = new Date(entry.timestamp);
      const tokens: TokenCounts = {
        input_tokens: entry.input_tokens || 0,
        output_tokens: entry.output_tokens || 0,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      };

      const totalTokens = getTotalTokens(tokens);
      const cost = entry.cost_usd || entry.cost || calculateCost(tokens, entry.model);

      // Update totals
      totalTokensAllTime += totalTokens;
      totalInputTokens += tokens.input_tokens;
      totalOutputTokens += tokens.output_tokens;
      totalCacheTokens += tokens.cache_creation_tokens + tokens.cache_read_tokens;
      totalCostAllTime += cost;

      // Today's stats
      if (entryDate >= todayStart) {
        totalTokensToday += totalTokens;
        totalCostToday += cost;
        messagesToday++;
      }

      // Model breakdown
      if (!modelBreakdown[entry.model]) {
        modelBreakdown[entry.model] = {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_tokens: 0,
          cache_read_tokens: 0
        };
      }
      modelBreakdown[entry.model].input_tokens += tokens.input_tokens;
      modelBreakdown[entry.model].output_tokens += tokens.output_tokens;
      modelBreakdown[entry.model].cache_creation_tokens += tokens.cache_creation_tokens;
      modelBreakdown[entry.model].cache_read_tokens += tokens.cache_read_tokens;

      // Count unique 5-hour session blocks
      const blockKey = this.getSessionBlockKey(entryDate);
      sessionBlocks.add(blockKey);
    }

    // Calculate current session stats (entries in the last 5 hours)
    const sessionStart = new Date(now - 5 * 60 * 60 * 1000);
    const currentSessionEntries = entries.filter(e => new Date(e.timestamp) >= sessionStart);

    let currentSessionTokens = 0;
    let currentSessionCost = 0;
    for (const entry of currentSessionEntries) {
      const tokens: TokenCounts = {
        input_tokens: entry.input_tokens || 0,
        output_tokens: entry.output_tokens || 0,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      };
      currentSessionTokens += getTotalTokens(tokens);
      currentSessionCost += entry.cost_usd || entry.cost || calculateCost(tokens, entry.model);
    }

    // Calculate burn rate
    const sessionDurationMinutes = (now - sessionStart.getTime()) / (1000 * 60);
    const burnRate: BurnRate = {
      tokens_per_minute: sessionDurationMinutes > 0 ? currentSessionTokens / sessionDurationMinutes : 0,
      cost_per_hour: sessionDurationMinutes > 0 ? (currentSessionCost / sessionDurationMinutes) * 60 : 0
    };

    // Session counts
    const todayBlocks = entries
      .filter(e => new Date(e.timestamp) >= todayStart)
      .map(e => this.getSessionBlockKey(new Date(e.timestamp)));
    const sessionsToday = new Set(todayBlocks).size;

    return {
      sessionsToday,
      totalSessions: sessionBlocks.size,
      currentSessionDuration: now - this.appStartTime,
      totalTokensToday,
      totalTokensAllTime,
      totalInputTokens,
      totalOutputTokens,
      totalCacheTokens,
      totalCostToday,
      totalCostAllTime,
      currentSessionTokens,
      currentSessionCost,
      currentBurnRate: burnRate,
      messagesCount,
      messagesToday,
      modelBreakdown
    };
  }

  /**
   * Get a session block key (5-hour blocks)
   */
  private getSessionBlockKey(date: Date): string {
    const blockSize = 5 * 60 * 60 * 1000; // 5 hours in ms
    const blockIndex = Math.floor(date.getTime() / blockSize);
    return `block_${blockIndex}`;
  }

  /**
   * Get current statistics
   */
  async getStats(): Promise<UsageStats> {
    // Refresh if cache is stale
    if (Date.now() - this.lastUpdate > this.updateInterval) {
      await this.refreshStats();
    }

    return this.cachedStats || this.getEmptyStats();
  }

  /**
   * Get statistics synchronously (uses cache)
   */
  getStatsSync(): UsageStats {
    return this.cachedStats || this.getEmptyStats();
  }

  /**
   * Get empty stats structure
   */
  private getEmptyStats(): UsageStats {
    return {
      sessionsToday: 0,
      totalSessions: 0,
      currentSessionDuration: Date.now() - this.appStartTime,
      totalTokensToday: 0,
      totalTokensAllTime: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheTokens: 0,
      totalCostToday: 0,
      totalCostAllTime: 0,
      currentSessionTokens: 0,
      currentSessionCost: 0,
      currentBurnRate: {
        tokens_per_minute: 0,
        cost_per_hour: 0
      },
      messagesCount: 0,
      messagesToday: 0,
      modelBreakdown: {}
    };
  }

  /**
   * Setup file watching to auto-refresh stats
   */
  setupAutoRefresh(callback?: () => void): fs.FSWatcher[] {
    // Watch for file changes
    const watchers = this.usageReader.watchForChanges(async () => {
      console.log('Usage data changed, refreshing stats...');
      await this.refreshStats();
      if (callback) callback();
    });

    // Also refresh periodically
    setInterval(async () => {
      await this.refreshStats();
      if (callback) callback();
    }, this.updateInterval);

    return watchers;
  }
}
