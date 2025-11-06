// ABOUTME: Reader service for parsing Claude Code usage data from JSONL log files
// ABOUTME: Discovers, reads, and watches for changes in Claude Code project usage logs
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { UsageEntry } from '../types/usage';

export class UsageReader {
  private claudeProjectsPath: string;

  constructor(claudePath?: string) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    this.claudeProjectsPath = claudePath || path.join(homeDir, '.claude', 'projects');
  }

  /**
   * Find all .jsonl files in the Claude projects directory
   */
  private async findJsonlFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      if (!fs.existsSync(this.claudeProjectsPath)) {
        console.log(`Claude projects path does not exist: ${this.claudeProjectsPath}`);
        return files;
      }

      const entries = fs.readdirSync(this.claudeProjectsPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(this.claudeProjectsPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findJsonlFilesInDir(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Error finding JSONL files:', error);
    }

    return files;
  }

  private async findJsonlFilesInDir(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.findJsonlFilesInDir(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Read and parse a single JSONL file
   */
  private async readJsonlFile(filePath: string): Promise<UsageEntry[]> {
    const entries: UsageEntry[] = [];

    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          // Check if this is a valid usage entry with message.usage data
          // Only include assistant messages (Claude's responses, not user prompts)
          if (data.timestamp && data.message && data.message.model && data.message.usage &&
              data.type === 'assistant' && data.message.role === 'assistant') {
            const usage = data.message.usage;

            // Extract response text from message content
            let responseText: string | undefined;
            if (data.message.content && Array.isArray(data.message.content) && data.message.content.length > 0) {
              const textContent = data.message.content.find((c: any) => c.type === 'text');
              if (textContent && textContent.text) {
                // Get first 200 characters for notification preview
                responseText = textContent.text.substring(0, 200);
              }
            }

            // Create a flattened entry with the data we need
            const entry: UsageEntry = {
              timestamp: data.timestamp,
              model: data.message.model,
              input_tokens: usage.input_tokens || 0,
              output_tokens: usage.output_tokens || 0,
              cache_creation_tokens: usage.cache_creation_input_tokens || 0,
              cache_read_tokens: usage.cache_read_input_tokens || 0,
              sessionId: data.sessionId,
              cwd: data.cwd,
              stop_reason: data.message.stop_reason,
              responseText: responseText,
              requestId: data.requestId,
              message_id: data.message.id
            };

            entries.push(entry);
          }
        } catch (parseError) {
          console.error(`Failed to parse JSON line in ${filePath}:`, parseError);
          // Continue processing other lines
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }

    return entries;
  }

  /**
   * Read all usage entries from all JSONL files
   * Limited to prevent memory issues with large log files
   */
  async readAllUsageData(cutoffDate?: Date, maxEntries: number = 2000): Promise<UsageEntry[]> {
    const allEntries: UsageEntry[] = [];
    const files = await this.findJsonlFiles();

    console.log(`Found ${files.length} JSONL files in ${this.claudeProjectsPath}`);

    // Sort files by modification time (newest first) so we read recent data first
    const filesWithStats = files.map(file => ({
      path: file,
      mtime: fs.statSync(file).mtime.getTime()
    }));
    filesWithStats.sort((a, b) => b.mtime - a.mtime);

    for (const fileInfo of filesWithStats) {
      const entries = await this.readJsonlFile(fileInfo.path);
      allEntries.push(...entries);

      // Early exit if we've collected enough entries (performance optimization)
      // Increased limit to ensure we get enough unique entries after deduplication
      if (allEntries.length > maxEntries * 5) {
        console.log(`Collected ${allEntries.length} entries, stopping early to prevent memory issues`);
        break;
      }
    }

    // Filter by cutoff date if provided
    let filteredEntries = allEntries;
    if (cutoffDate) {
      filteredEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= cutoffDate;
      });
    }

    // Deduplicate based on message_id or request_id
    console.log(`Before deduplication: ${filteredEntries.length} entries`);
    const uniqueEntries = this.deduplicateEntries(filteredEntries);
    console.log(`After deduplication: ${uniqueEntries.length} unique entries (removed ${filteredEntries.length - uniqueEntries.length} duplicates)`);

    // Sort by timestamp descending (newest first) and limit to maxEntries
    const sortedEntries = uniqueEntries.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const limitedEntries = sortedEntries.slice(0, maxEntries);

    console.log(`Returning ${limitedEntries.length} most recent entries (limited from ${sortedEntries.length})`);
    return limitedEntries;
  }

  /**
   * Deduplicate entries based on message_id or request_id
   */
  private deduplicateEntries(entries: UsageEntry[]): UsageEntry[] {
    const seen = new Set<string>();
    const unique: UsageEntry[] = [];

    for (const entry of entries) {
      // Create composite key from message_id and request_id (like claude-monitor does)
      const messageId = entry.message_id || entry.uuid;
      const requestId = entry.request_id || entry.requestId;

      if (!messageId || !requestId) {
        // If missing IDs, include it anyway
        unique.push(entry);
        continue;
      }

      const compositeKey = `${messageId}:${requestId}`;
      if (!seen.has(compositeKey)) {
        seen.add(compositeKey);
        unique.push(entry);
      }
    }

    return unique;
  }

  /**
   * Get the most recent usage entry
   */
  async getLatestEntry(): Promise<UsageEntry | null> {
    const entries = await this.readAllUsageData();
    if (entries.length === 0) return null;

    return entries.reduce((latest, entry) => {
      const latestDate = new Date(latest.timestamp);
      const entryDate = new Date(entry.timestamp);
      return entryDate > latestDate ? entry : latest;
    });
  }

  /**
   * Watch for changes to JSONL files
   */
  watchForChanges(callback: () => void): fs.FSWatcher[] {
    const watchers: fs.FSWatcher[] = [];

    try {
      if (!fs.existsSync(this.claudeProjectsPath)) {
        console.log(`Cannot watch path (doesn't exist): ${this.claudeProjectsPath}`);
        return watchers;
      }

      // Watch the projects directory for new files
      const watcher = fs.watch(this.claudeProjectsPath, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.jsonl')) {
          console.log(`Detected change in ${filename}`);
          callback();
        }
      });

      watchers.push(watcher);
    } catch (error) {
      console.error('Error setting up file watcher:', error);
    }

    return watchers;
  }
}
