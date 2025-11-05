# Claude Code Integration Guide

This document outlines how to integrate this menu bar app with Claude Code.

## Overview

The menu bar app needs to detect when Claude Code completes tasks to trigger notifications. There are several approaches to achieve this:

## Approach 1: Log File Monitoring (Recommended)

Monitor Claude Code's log files for completion markers.

### Implementation Steps

1. **Locate Claude Code Logs**
   - Typically in: `~/.config/claude-code/logs/` or similar
   - Need to identify the log format and location

2. **Create Log Watcher Service**
   ```typescript
   // src/services/claudeCodeWatcher.ts
   import * as fs from 'fs';
   import * as path from 'path';

   export class ClaudeCodeWatcher {
     private logPath: string;
     private watcher: fs.FSWatcher | null = null;

     startWatching(onComplete: () => void) {
       // Watch for file changes
       // Parse logs for completion markers
       // Call onComplete when task finishes
     }
   }
   ```

3. **Integration in main.ts**
   ```typescript
   import { ClaudeCodeWatcher } from './services/claudeCodeWatcher';

   const watcher = new ClaudeCodeWatcher();
   watcher.startWatching(() => {
     notificationService.notifyTaskComplete();
     analyticsService.recordTaskCompletion();
   });
   ```

## Approach 2: IPC/Socket Communication

If Claude Code exposes an API or socket, connect directly.

### Benefits
- Real-time updates
- More reliable than log parsing
- Can get detailed task information

### Requirements
- Claude Code needs to expose an API endpoint
- Or use a shared socket/named pipe
- Document the protocol

## Approach 3: File System Watching

Watch for marker files that Claude Code creates.

### Example
```typescript
// Claude Code creates: ~/.claude-code/status/current-task.json
// Contains: { status: "working" | "complete", task: "..." }

fs.watch(statusPath, (eventType, filename) => {
  const status = JSON.parse(fs.readFileSync(statusPath));
  if (status.status === 'complete') {
    notificationService.notifyTaskComplete(status.task);
  }
});
```

## Approach 4: CLI Integration

Wrap Claude Code CLI commands to detect completion.

```bash
# User runs:
claude-code-wrapper "fix the bug"

# Wrapper script:
# 1. Runs actual claude-code command
# 2. Signals our app when done
# 3. App shows notification
```

## Configuration

Add to settings:

```typescript
interface Settings {
  // ... existing settings
  claudeCodePath?: string;
  watchMethod: 'logs' | 'ipc' | 'filesystem' | 'cli';
  logPath?: string;
  statusFilePath?: string;
}
```

## Next Steps

1. **Investigate Claude Code**
   - How does it log activity?
   - Does it have any APIs?
   - What's the best integration point?

2. **Implement Watcher Service**
   - Based on findings above
   - Add to services/

3. **Test Integration**
   - Run Claude Code
   - Verify notifications trigger correctly
   - Check analytics tracking

4. **Document Usage**
   - Update README with setup instructions
   - Add configuration examples
   - Provide troubleshooting guide

## Testing

```bash
# Manual test
touch ~/.claude-code-test-complete
# Should trigger notification if watching this file

# Or simulate log entry
echo "Task completed successfully" >> ~/.claude-code/logs/latest.log
```

## Security Considerations

- Only watch user-owned files
- Validate file paths to prevent directory traversal
- Don't execute arbitrary commands from log files
- Respect user privacy - don't send analytics externally
