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

          // Validate required fields
          if (data.timestamp && data.model &&
              (data.input_tokens !== undefined || data.output_tokens !== undefined)) {
            entries.push(data as UsageEntry);
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
   */
  async readAllUsageData(cutoffDate?: Date): Promise<UsageEntry[]> {
    const allEntries: UsageEntry[] = [];
    const files = await this.findJsonlFiles();

    console.log(`Found ${files.length} JSONL files in ${this.claudeProjectsPath}`);

    for (const file of files) {
      const entries = await this.readJsonlFile(file);
      allEntries.push(...entries);
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
    const uniqueEntries = this.deduplicateEntries(filteredEntries);

    console.log(`Loaded ${uniqueEntries.length} unique usage entries`);
    return uniqueEntries;
  }

  /**
   * Deduplicate entries based on message_id or request_id
   */
  private deduplicateEntries(entries: UsageEntry[]): UsageEntry[] {
    const seen = new Set<string>();
    const unique: UsageEntry[] = [];

    for (const entry of entries) {
      const id = entry.message_id || entry.request_id || entry.requestId;
      if (!id) {
        // If no ID, include it anyway
        unique.push(entry);
        continue;
      }

      if (!seen.has(id)) {
        seen.add(id);
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
