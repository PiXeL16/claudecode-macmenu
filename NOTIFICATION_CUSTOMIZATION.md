# Notification Customization

The Mac menu bar app now supports customizable notification content! Users can choose exactly what information appears in their notifications.

## Settings Structure

The new `notificationBody` settings object contains these options:

```typescript
notificationBody: {
  showSessionId: boolean;          // Show short session ID
  showTotalTokens: boolean;        // Show total token count
  showTokenBreakdown: boolean;     // Show input→output token split
  showCacheStats: boolean;         // Show cache read/created stats
  showCost: boolean;               // Show cost in USD
  showTimestamp: boolean;          // Show time of completion
  showStopReason: boolean;         // Show why Claude stopped
  showResponsePreview: boolean;    // Show preview of Claude's response
  previewLength: number;           // Length of response preview (default: 100)
}
```

## Default Configuration

By default, notifications show:
- ✅ Session ID
- ✅ Total tokens
- ✅ Cost
- ✅ Timestamp
- ❌ Token breakdown
- ❌ Cache stats
- ❌ Stop reason
- ❌ Response preview

This maintains backward compatibility with the original notification format.

## Example Notification Formats

### Default
```
Session: abc123de
25,700 tokens | $0.0456 | 9:35:56 PM
```

### Detailed (with token breakdown and stop reason)
```
Session: abc123de | Stopped: end_turn
25,700 tokens (12,500→3,200) | $0.0456 | 9:35:56 PM
```

### With Cache Stats
```
Session: abc123de
25,700 tokens | $0.0456 | 9:35:56 PM
💾 Cache: 8.0K read, 2.0K created
```

### With Response Preview
```
25,700 tokens | $0.0456
"I'll help you add more customization to the Mac notifications, Chris! Let me first explore the curre..."
```

### Minimal (cost only)
```
$0.0456
```

## Implementation Details

### Notification Body Builder
The `buildNotificationBody()` method in `NotificationService` constructs the notification body dynamically based on user preferences:

1. **Line 1**: Session ID and/or stop reason (separated by `|`)
2. **Line 2**: Tokens, cost, timestamp (separated by `|`)
3. **Line 3**: Cache stats (if available and enabled)
4. **Line 4**: Response preview (if enabled)

### Smart Rendering
- Only shows lines that have content
- Only shows cache stats if cache tokens are present
- Truncates preview to first line or configured length
- Handles missing data gracefully

## Future Enhancements

Potential additions for the future:
- Preset templates (minimal, detailed, developer)
- Per-project notification profiles
- Notification action buttons (requires code signing)
- Custom preview length per user
- Filter notifications by cost threshold or stop reason
