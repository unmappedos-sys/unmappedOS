# iOS Live Activity Integration (Native Module Stub)

**Status**: Not implemented in MVP (requires native iOS development)

## Overview

iOS Live Activities provide persistent, glanceable updates on the lock screen and Dynamic Island. For Unmapped OS, this would show:
- Active anchor target
- Distance to anchor
- Current zone status
- Check-in timer (45 minutes)

## Architecture

```
React Native (Future) → Native Module Bridge → Swift/Objective-C
                                              ↓
                                    ActivityKit (iOS 16.1+)
                                              ↓
                                    Live Activity Widget
```

## Sample Payload

When user exports anchor to Google Maps, the app would start a Live Activity:

```swift
// Swift pseudo-code
struct AnchorActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var anchorName: String
        var distance: Double
        var zoneId: String
        var checkInTime: Date
    }

    var cityName: String
}

// Start activity
let attributes = AnchorActivityAttributes(cityName: "Bangkok")
let contentState = AnchorActivityAttributes.ContentState(
    anchorName: "Democracy Monument",
    distance: 1.2,
    zoneId: "BKK_001",
    checkInTime: Date().addingTimeInterval(45 * 60)
)

let activity = try Activity<AnchorActivityAttributes>.request(
    attributes: attributes,
    contentState: contentState,
    pushType: nil
)
```

## UI Design

**Dynamic Island (Expanded)**:
```
┌─────────────────────────────────┐
│ 🎯 Democracy Monument           │
│ 1.2 km away • BKK_001           │
│ ⏱️  42 min until check-in        │
│ [Open in Maps] [Cancel Trip]    │
└─────────────────────────────────┘
```

**Lock Screen Widget**:
```
╔═══════════════════════════════╗
║ UNMAPPED OS                   ║
║                               ║
║ 🎯 Democracy Monument         ║
║ Bangkok • BKK_001             ║
║                               ║
║ Distance: 1.2 km              ║
║ Check-in: 42 min remaining    ║
║                               ║
║ [Tap to navigate]             ║
╚═══════════════════════════════╝
```

## Integration Steps (For Future Implementation)

### 1. Create React Native Wrapper
```bash
npx react-native init UnmappedOSNative
cd UnmappedOSNative
```

### 2. Create Native Module
```swift
// ios/LiveActivityModule.swift
import ActivityKit

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  
  @objc
  func startAnchorActivity(
    _ cityName: String,
    anchorName: String,
    distance: Double,
    zoneId: String,
    checkInMinutes: Int
  ) {
    // Implementation
  }
  
  @objc
  func updateDistance(_ distance: Double) {
    // Update existing activity
  }
  
  @objc
  func endActivity() {
    // End activity when anchor reached
  }
}
```

### 3. Bridge to JavaScript
```typescript
// src/native/LiveActivity.ts
import { NativeModules } from 'react-native';

const { LiveActivityModule } = NativeModules;

export const LiveActivity = {
  start: (data: {
    cityName: string;
    anchorName: string;
    distance: number;
    zoneId: string;
    checkInMinutes: number;
  }) => LiveActivityModule.startAnchorActivity(...Object.values(data)),
  
  updateDistance: (distance: number) => LiveActivityModule.updateDistance(distance),
  
  end: () => LiveActivityModule.endActivity(),
};
```

### 4. Info.plist Configuration
```xml
<key>NSSupportsLiveActivities</key>
<true/>
```

### 5. Entitlements
Add `com.apple.developer.activity` to app entitlements.

## PWA Fallback (Current MVP)

Since PWA cannot access Live Activities, the MVP uses:
- **Persistent notification** with action buttons
- **localStorage** to track active trip
- **45-minute setTimeout** for check-in reminder
- **Service worker** for background notifications

See `apps/web/lib/deviceAPI.ts` for current implementation.

## Future Enhancements

- Real-time distance updates via GPS
- Hazard alerts pushed to Live Activity
- Zone status changes reflected immediately
- Deep linking from activity to map
- Siri shortcuts integration ("Start trip to [anchor]")

## References

- [Apple ActivityKit Documentation](https://developer.apple.com/documentation/activitykit)
- [Live Activities Tutorial](https://developer.apple.com/videos/play/wwdc2022/10184/)
- [React Native Live Activity Example](https://github.com/mateoguzmana/react-native-live-activities)
