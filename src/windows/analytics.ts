// ABOUTME: Analytics window manager for displaying usage charts and insights
// ABOUTME: Implements singleton pattern and manages analytics data aggregation
import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { UsageReader } from '../services/usageReader';
import { calculateCost, getTotalTokens, normalizeModelName } from '../types/usage';

export class AnalyticsWindow {
  private static instance: BrowserWindow | null = null;
  private ipcHandlersRegistered = false;

  constructor(private usageReader: UsageReader) {
    this.setupIpcHandlers();
  }

  show(): void {
    if (AnalyticsWindow.instance) {
      AnalyticsWindow.instance.show();
      AnalyticsWindow.instance.focus();
      return;
    }

    AnalyticsWindow.instance = new BrowserWindow({
      width: 1200,
      height: 800,
      resizable: true,
      minimizable: true,
      maximizable: true,
      fullscreenable: false,
      show: false,
      title: 'Analytics',
      vibrancy: 'sidebar',
      backgroundColor: '#0a0a0a',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    AnalyticsWindow.instance.loadFile(path.join(__dirname, '../ui/analytics.html'));

    AnalyticsWindow.instance.once('ready-to-show', () => {
      AnalyticsWindow.instance?.show();
    });

    AnalyticsWindow.instance.on('closed', () => {
      this.cleanup();
      AnalyticsWindow.instance = null;
    });
  }

  private setupIpcHandlers(): void {
    if (this.ipcHandlersRegistered) {
      return;
    }
    this.ipcHandlersRegistered = true;

    ipcMain.handle('get-analytics-data', async (event, timeRange: '7d' | '30d' | '90d' | 'all') => {
      return await this.aggregateAnalyticsData(timeRange);
    });
  }

  private async aggregateAnalyticsData(timeRange: '7d' | '30d' | '90d' | 'all') {
    // Calculate cutoff date based on time range
    let cutoffDate: Date | undefined;
    if (timeRange !== 'all') {
      const daysMap: { [key: string]: number } = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };
      const days = daysMap[timeRange];
      cutoffDate = new Date();
      cutoffDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      cutoffDate.setDate(cutoffDate.getDate() - days);
      console.log(`Analytics time range: ${timeRange} (${days} days), cutoff: ${cutoffDate.toISOString()}`);
    }

    // Get all entries
    const entries = await this.usageReader.readAllUsageData(cutoffDate, 10000);
    console.log(`Loaded ${entries.length} entries for analytics`);

    // Daily usage aggregation
    const dailyMap = new Map<string, { tokens: number; cost: number }>();
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      const tokens = getTotalTokens({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      });
      const cost = calculateCost({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      }, entry.model);

      if (dailyMap.has(date)) {
        const existing = dailyMap.get(date)!;
        dailyMap.set(date, {
          tokens: existing.tokens + tokens,
          cost: existing.cost + cost
        });
      } else {
        dailyMap.set(date, { tokens, cost });
      }
    });

    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Daily messages count
    const dailyMessagesMap = new Map<string, number>();
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      dailyMessagesMap.set(date, (dailyMessagesMap.get(date) || 0) + 1);
    });

    const dailyMessages = Array.from(dailyMessagesMap.entries())
      .map(([date, messages]) => ({ date, messages }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Project costs aggregation
    const projectMap = new Map<string, number>();
    entries.forEach(entry => {
      const project = entry.cwd ? path.basename(entry.cwd) : 'Unknown';
      const cost = calculateCost({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      }, entry.model);

      projectMap.set(project, (projectMap.get(project) || 0) + cost);
    });

    const projectCosts = Array.from(projectMap.entries())
      .map(([project, cost]) => ({ project, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10); // Top 10 projects

    // Model distribution
    const modelMap = new Map<string, number>();
    let totalTokens = 0;
    entries.forEach(entry => {
      const model = normalizeModelName(entry.model);
      const tokens = getTotalTokens({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      });

      modelMap.set(model, (modelMap.get(model) || 0) + tokens);
      totalTokens += tokens;
    });

    const modelDistribution = Array.from(modelMap.entries())
      .map(([model, tokens]) => ({
        model: model.replace('claude-', ''),
        tokens,
        percentage: Math.round((tokens / totalTokens) * 100)
      }))
      .sort((a, b) => b.tokens - a.tokens);

    // Cumulative spending
    let cumulative = 0;
    const cumulativeSpending = dailyUsage.map(day => {
      cumulative += day.cost;
      return {
        date: day.date,
        total: cumulative
      };
    });

    // Burn rate (daily average over rolling 7-day window)
    const burnRate = dailyUsage.map((day, index) => {
      const windowStart = Math.max(0, index - 6);
      const window = dailyUsage.slice(windowStart, index + 1);
      const avgCost = window.reduce((sum, d) => sum + d.cost, 0) / window.length;
      return {
        date: day.date,
        rate: avgCost
      };
    });

    // Session statistics - track first and last timestamp per session
    const sessionMap = new Map<string, {
      firstTimestamp: number;
      lastTimestamp: number;
      tokens: number;
      cost: number;
      date: string;
      project: string;
    }>();

    entries.forEach(entry => {
      if (!entry.sessionId) return;

      const timestamp = new Date(entry.timestamp).getTime();
      const session = sessionMap.get(entry.sessionId) || {
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
        tokens: 0,
        cost: 0,
        date: new Date(entry.timestamp).toISOString().split('T')[0],
        project: entry.cwd ? path.basename(entry.cwd) : 'Unknown'
      };

      // Update timestamps to track session duration
      session.firstTimestamp = Math.min(session.firstTimestamp, timestamp);
      session.lastTimestamp = Math.max(session.lastTimestamp, timestamp);

      const tokens = getTotalTokens({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      });

      const cost = calculateCost({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      }, entry.model);

      session.tokens += tokens;
      session.cost += cost;
      sessionMap.set(entry.sessionId, session);
    });

    // Calculate durations in minutes
    const sessions = Array.from(sessionMap.entries()).map(([sessionId, session]) => {
      const durationMs = session.lastTimestamp - session.firstTimestamp;
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000)); // At least 1 minute
      return {
        sessionId,
        duration: durationMinutes,
        tokens: session.tokens,
        cost: session.cost,
        date: session.date,
        project: session.project
      };
    });

    const sessionDurations = sessions.map(s => s.duration).filter(d => d > 0);
    const sessionStats = {
      averageDuration: sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0,
      longestSession: sessions.length > 0
        ? sessions.reduce((max, s) => s.duration > max.duration ? s : max, sessions[0])
        : { duration: 0, date: '' },
      shortestSession: sessions.length > 0
        ? sessions.reduce((min, s) => s.duration > 0 && s.duration < min.duration ? s : min, sessions[0])
        : { duration: 0, date: '' },
      totalSessions: sessions.length
    };

    // Hourly usage pattern
    const hourlyMap = new Map<number, number>();
    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });
    const hourlyUsage = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyMap.get(hour) || 0
    }));

    // Weekday usage
    const weekdayMap = new Map<string, { sessions: Set<string>; cost: number }>();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    entries.forEach(entry => {
      const dayIndex = new Date(entry.timestamp).getDay();
      const day = days[dayIndex];
      const data = weekdayMap.get(day) || { sessions: new Set(), cost: 0 };

      if (entry.sessionId) data.sessions.add(entry.sessionId);
      data.cost += calculateCost({
        input_tokens: entry.input_tokens,
        output_tokens: entry.output_tokens,
        cache_creation_tokens: entry.cache_creation_tokens || 0,
        cache_read_tokens: entry.cache_read_tokens || 0
      }, entry.model);

      weekdayMap.set(day, data);
    });
    const weekdayUsage = days.map(day => {
      const data = weekdayMap.get(day) || { sessions: new Set(), cost: 0 };
      return { day, sessions: data.sessions.size, cost: data.cost };
    });

    // Cache statistics
    let totalInput = 0, totalOutput = 0, totalCacheCreation = 0, totalCacheRead = 0;
    let cacheSavings = 0;
    entries.forEach(entry => {
      totalInput += entry.input_tokens;
      totalOutput += entry.output_tokens;
      totalCacheCreation += entry.cache_creation_tokens || 0;
      totalCacheRead += entry.cache_read_tokens || 0;

      // Calculate savings: cache reads cost less than regular input
      if (entry.cache_read_tokens) {
        const model = normalizeModelName(entry.model);
        const pricing = require('../types/usage').MODEL_PRICING[model];
        if (pricing) {
          const normalCost = (entry.cache_read_tokens / 1_000_000) * pricing.input;
          const cacheCost = (entry.cache_read_tokens / 1_000_000) * pricing.cache_read;
          cacheSavings += (normalCost - cacheCost);
        }
      }
    });

    const totalCacheTokens = totalCacheCreation + totalCacheRead;
    const cacheStats = {
      hitRate: totalCacheTokens > 0 ? (totalCacheRead / totalCacheTokens) * 100 : 0,
      savingsTotal: cacheSavings,
      cacheCreationTokens: totalCacheCreation,
      cacheReadTokens: totalCacheRead
    };

    const tokenBreakdown = {
      input: totalInput,
      output: totalOutput,
      cacheCreation: totalCacheCreation,
      cacheRead: totalCacheRead
    };

    // Top 10 most expensive sessions (already have sessions array with durations)
    const topSessions = sessions
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      dailyUsage,
      dailyMessages,
      projectCosts,
      modelDistribution,
      cumulativeSpending,
      burnRate,
      sessionStats,
      hourlyUsage,
      weekdayUsage,
      cacheStats,
      tokenBreakdown,
      topSessions
    };
  }

  private cleanup(): void {
    if (!this.ipcHandlersRegistered) {
      return;
    }

    console.log('Cleaning up analytics IPC handlers...');
    ipcMain.removeHandler('get-analytics-data');
    this.ipcHandlersRegistered = false;
  }
}
