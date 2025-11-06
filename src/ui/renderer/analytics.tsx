// ABOUTME: React component for analytics dashboard with interactive charts
// ABOUTME: Displays usage trends, costs, and model breakdowns using Recharts
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const { ipcRenderer } = window.require('electron');

// Terminal color palette
const COLORS = {
  orange: '#ff9500',
  green: '#00ff00',
  blue: '#0a84ff',
  yellow: '#ffcc00',
  red: '#ff3b30',
  purple: '#af52de',
  pink: '#ff2d55',
  cyan: '#5ac8fa'
};

const CHART_COLORS = [
  COLORS.orange,
  COLORS.blue,
  COLORS.green,
  COLORS.yellow,
  COLORS.purple,
  COLORS.pink,
  COLORS.cyan,
  COLORS.red
];

interface AnalyticsData {
  dailyUsage: Array<{ date: string; tokens: number; cost: number }>;
  dailyMessages: Array<{ date: string; messages: number }>;
  projectCosts: Array<{ project: string; cost: number }>;
  modelDistribution: Array<{ model: string; tokens: number; percentage: number }>;
  cumulativeSpending: Array<{ date: string; total: number }>;
  burnRate: Array<{ date: string; rate: number }>;
  sessionStats: {
    averageDuration: number;
    longestSession: { duration: number; date: string };
    shortestSession: { duration: number; date: string };
    totalSessions: number;
  };
  hourlyUsage: Array<{ hour: number; count: number }>;
  weekdayUsage: Array<{ day: string; sessions: number; cost: number }>;
  cacheStats: {
    hitRate: number;
    savingsTotal: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  tokenBreakdown: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  topSessions: Array<{
    sessionId: string;
    cost: number;
    tokens: number;
    date: string;
    project: string;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const analyticsData = await ipcRenderer.invoke('get-analytics-data', timeRange);
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl mb-4" style={{ color: COLORS.orange }}>LOADING ANALYTICS...</div>
          <div className="text-sm" style={{ color: '#808080' }}>Analyzing usage data</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-2xl mb-4" style={{ color: COLORS.red }}>NO DATA AVAILABLE</div>
          <div className="text-sm" style={{ color: '#808080' }}>Start using Claude Code to see analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.orange }}>
          USAGE ANALYTICS
        </h1>
        <div className="flex gap-2 mb-4">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs border ${
                timeRange === range
                  ? 'border-orange-500 bg-orange-500 text-black'
                  : 'border-gray-600 bg-transparent text-gray-400 hover:border-orange-500'
              }`}
              style={{
                borderRadius: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {range === 'all' ? 'ALL TIME' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <div className="text-xs text-gray-500 mb-1">CACHE HIT RATE</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.green }}>
            {data.cacheStats.hitRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Saved ${data.cacheStats.savingsTotal.toFixed(2)}
          </div>
        </div>

        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <div className="text-xs text-gray-500 mb-1">AVG SESSION</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.blue }}>
            {Math.round(data.sessionStats.averageDuration)}m
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.sessionStats.totalSessions} sessions
          </div>
        </div>

        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <div className="text-xs text-gray-500 mb-1">LONGEST SESSION</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.orange }}>
            {Math.round(data.sessionStats.longestSession.duration)}m
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.sessionStats.longestSession.date}
          </div>
        </div>

        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <div className="text-xs text-gray-500 mb-1">TOTAL SAVED</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.green }}>
            ${data.cacheStats.savingsTotal.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            via prompt caching
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Token Usage */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            DAILY TOKEN USAGE
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <YAxis
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#808080' }}
              />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke={COLORS.orange}
                strokeWidth={2}
                dot={{ fill: COLORS.orange, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Project */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            COST BY PROJECT
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.projectCosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="project"
                stroke="#808080"
                style={{ fontSize: '10px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
                formatter={(value: number) => `$${value.toFixed(4)}`}
              />
              <Bar dataKey="cost" fill={COLORS.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            MODEL USAGE DISTRIBUTION
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.modelDistribution}
                dataKey="tokens"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.model}: ${entry.percentage}%`}
                labelStyle={{ fontSize: '10px', fill: '#e0e0e0' }}
              >
                {data.modelDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative Spending */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            CUMULATIVE SPENDING
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.cumulativeSpending}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <YAxis
                stroke="#808080"
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
                formatter={(value: number) => `$${value.toFixed(4)}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={COLORS.green}
                fill={COLORS.green}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Token Type Breakdown */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            TOKEN TYPE BREAKDOWN
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Input', value: data.tokenBreakdown.input },
                  { name: 'Output', value: data.tokenBreakdown.output },
                  { name: 'Cache Creation', value: data.tokenBreakdown.cacheCreation },
                  { name: 'Cache Read', value: data.tokenBreakdown.cacheRead }
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${((entry.value / (data.tokenBreakdown.input + data.tokenBreakdown.output + data.tokenBreakdown.cacheCreation + data.tokenBreakdown.cacheRead)) * 100).toFixed(1)}%`}
                labelStyle={{ fontSize: '10px', fill: '#e0e0e0' }}
              >
                <Cell fill={COLORS.blue} />
                <Cell fill={COLORS.orange} />
                <Cell fill={COLORS.yellow} />
                <Cell fill={COLORS.green} />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Usage Pattern */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            USAGE BY HOUR OF DAY
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.hourlyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="hour"
                stroke="#808080"
                style={{ fontSize: '10px' }}
                tickFormatter={(hour) => `${hour}:00`}
              />
              <YAxis
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
                labelFormatter={(hour) => `Hour: ${hour}:00`}
              />
              <Bar dataKey="count" fill={COLORS.purple} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday Usage */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            USAGE BY DAY OF WEEK
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.weekdayUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="day"
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#808080"
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#808080' }}
              />
              <Bar yAxisId="left" dataKey="sessions" fill={COLORS.cyan} name="Sessions" />
              <Bar yAxisId="right" dataKey="cost" fill={COLORS.pink} name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Messages Per Day Trend */}
        <div className="border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
            MESSAGES PER DAY
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyMessages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <YAxis
                stroke="#808080"
                style={{ fontSize: '10px' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 0,
                  color: '#e0e0e0',
                  fontSize: '11px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#808080' }}
              />
              <Line
                type="monotone"
                dataKey="messages"
                stroke={COLORS.yellow}
                strokeWidth={2}
                dot={{ fill: COLORS.yellow, r: 3 }}
                name="Messages"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Sessions Table */}
      <div className="mt-6 border border-gray-800 p-4" style={{ background: '#1a1a1a' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#e0e0e0', letterSpacing: '0.5px' }}>
          TOP 10 MOST EXPENSIVE SESSIONS
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th className="text-left py-2 px-2" style={{ color: '#808080' }}>SESSION ID</th>
                <th className="text-left py-2 px-2" style={{ color: '#808080' }}>PROJECT</th>
                <th className="text-right py-2 px-2" style={{ color: '#808080' }}>TOKENS</th>
                <th className="text-right py-2 px-2" style={{ color: '#808080' }}>COST</th>
                <th className="text-left py-2 px-2" style={{ color: '#808080' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {data.topSessions.map((session, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                  <td className="py-2 px-2" style={{ color: COLORS.orange }}>
                    {session.sessionId.substring(0, 8)}...
                  </td>
                  <td className="py-2 px-2" style={{ color: '#e0e0e0' }}>
                    {session.project}
                  </td>
                  <td className="text-right py-2 px-2" style={{ color: '#e0e0e0' }}>
                    {session.tokens.toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2" style={{ color: COLORS.green }}>
                    ${session.cost.toFixed(4)}
                  </td>
                  <td className="py-2 px-2" style={{ color: '#808080' }}>
                    {session.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Render the app
(async () => {
  try {
    console.log('Analytics renderer: Starting to render dashboard...');
    const container = document.getElementById('root');
    if (container) {
      const root = createRoot(container);
      root.render(<AnalyticsDashboard />);
      console.log('Analytics renderer: Dashboard rendered successfully');
    } else {
      throw new Error('Root container not found');
    }
  } catch (error) {
    console.error('Analytics renderer: Failed to render dashboard:', error);
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: #ff0000; font-family: monospace;">
          <h1>Error Loading Analytics</h1>
          <p>${(error as Error).message}</p>
          <pre>${(error as Error).stack}</pre>
        </div>
      `;
    }
  }
})();
