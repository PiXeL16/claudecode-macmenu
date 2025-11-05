import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { SettingsManager } from './settings';

export interface SessionData {
  startTime: number;
  endTime?: number;
  duration: number;
}

export interface AnalyticsData {
  sessions: SessionData[];
  totalDuration: number;
  lastSessionDate: string;
}

export interface Stats {
  sessionsToday: number;
  totalSessions: number;
  currentSessionDuration: number;
  totalDuration: number;
  averageSessionDuration: number;
}

export class AnalyticsService {
  private analyticsPath: string;
  private data: AnalyticsData;
  private currentSession: SessionData | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;

  constructor(private settingsManager: SettingsManager) {
    const userDataPath = app.getPath('userData');
    this.analyticsPath = path.join(userDataPath, 'analytics.json');
    this.data = this.loadAnalytics();
  }

  private loadAnalytics(): AnalyticsData {
    try {
      if (fs.existsSync(this.analyticsPath)) {
        const data = fs.readFileSync(this.analyticsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
    return {
      sessions: [],
      totalDuration: 0,
      lastSessionDate: new Date().toISOString()
    };
  }

  private saveAnalytics(): void {
    try {
      const dir = path.dirname(this.analyticsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.analyticsPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }

  startSession(): void {
    this.currentSession = {
      startTime: Date.now(),
      duration: 0
    };

    // Update session duration every second
    this.sessionTimer = setInterval(() => {
      if (this.currentSession) {
        this.currentSession.duration = Date.now() - this.currentSession.startTime;
      }
    }, 1000);
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

      this.data.sessions.push(this.currentSession);
      this.data.totalDuration += this.currentSession.duration;
      this.data.lastSessionDate = new Date().toISOString();

      this.saveAnalytics();

      if (this.sessionTimer) {
        clearInterval(this.sessionTimer);
        this.sessionTimer = null;
      }

      this.currentSession = null;
    }
  }

  getStats(): Stats {
    const today = new Date().toDateString();
    const sessionsToday = this.data.sessions.filter(session => {
      return new Date(session.startTime).toDateString() === today;
    }).length;

    const currentSessionDuration = this.currentSession?.duration || 0;
    const averageSessionDuration = this.data.sessions.length > 0
      ? this.data.totalDuration / this.data.sessions.length
      : 0;

    return {
      sessionsToday,
      totalSessions: this.data.sessions.length,
      currentSessionDuration,
      totalDuration: this.data.totalDuration,
      averageSessionDuration
    };
  }

  resetStats(): void {
    this.data = {
      sessions: [],
      totalDuration: 0,
      lastSessionDate: new Date().toISOString()
    };
    this.saveAnalytics();
  }

  // Get sessions for a specific date range
  getSessionsInRange(startDate: Date, endDate: Date): SessionData[] {
    return this.data.sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }
}
