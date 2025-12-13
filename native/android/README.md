# Android Persistent Notifications (Native Module Stub)

**Status**: Not implemented in MVP (requires native Android development)

## Overview

Android persistent notifications provide ongoing trip status in the notification drawer. For Unmapped OS, this would show:
- Active anchor target
- Distance to anchor
- Current zone status
- Check-in timer with countdown

## Architecture

```
React Native (Future) → Native Module Bridge → Kotlin/Java
                                              ↓
                                    NotificationManager
                                              ↓
                                    ForegroundService
                                              ↓
                                    Persistent Notification
```

## Sample Implementation

```kotlin
// android/app/src/main/java/com/unmappedos/TripNotificationService.kt
class TripNotificationService : Service() {
    
    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "unmapped_trip"
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val anchorName = intent?.getStringExtra("anchorName") ?: "Unknown"
        val distance = intent?.getDoubleExtra("distance", 0.0) ?: 0.0
        val zoneId = intent?.getStringExtra("zoneId") ?: ""
        
        val notification = buildNotification(anchorName, distance, zoneId)
        startForeground(NOTIFICATION_ID, notification)
        
        return START_STICKY
    }
    
    private fun buildNotification(
        anchorName: String,
        distance: Double,
        zoneId: String
    ): Notification {
        val openMapIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$anchorName")),
            PendingIntent.FLAG_IMMUTABLE
        )
        
        val cancelIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, TripNotificationService::class.java).apply {
                action = "CANCEL_TRIP"
            },
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🎯 $anchorName")
            .setContentText("${distance.format(1)} km • $zoneId")
            .setSmallIcon(R.drawable.ic_anchor)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .addAction(
                R.drawable.ic_map,
                "Open Maps",
                openMapIntent
            )
            .addAction(
                R.drawable.ic_cancel,
                "Cancel",
                cancelIntent
            )
            .build()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
```

## Notification UI Design

```
╔═══════════════════════════════════════╗
║ 🎯 Democracy Monument                 ║
║ 1.2 km • BKK_001                      ║
║ ⏱️  Check-in in 42 minutes            ║
║                                       ║
║ [🗺️  Open Maps]  [❌ Cancel Trip]     ║
╚═══════════════════════════════════════╝
```

## React Native Bridge

```typescript
// src/native/TripNotification.ts
import { NativeModules } from 'react-native';

const { TripNotificationModule } = NativeModules;

export const TripNotification = {
  start: (data: {
    anchorName: string;
    distance: number;
    zoneId: string;
    checkInMinutes: number;
  }) => TripNotificationModule.startNotification(data),
  
  updateDistance: (distance: number) => 
    TripNotificationModule.updateDistance(distance),
  
  cancel: () => TripNotificationModule.cancelNotification(),
};
```

## AndroidManifest.xml Configuration

```xml
<manifest>
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  
  <application>
    <service
      android:name=".TripNotificationService"
      android:enabled="true"
      android:exported="false"
      android:foregroundServiceType="location" />
  </application>
</manifest>
```

## Notification Channel Setup

```kotlin
// Create notification channel (Android 8.0+)
fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            "unmapped_trip",
            "Trip Navigation",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Active trip to anchor point"
            enableVibration(true)
            setShowBadge(true)
        }
        
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }
}
```

## Location Updates Integration

```kotlin
// Use Fused Location Provider for distance updates
class LocationTracker(private val context: Context) {
    
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
    private var targetLat: Double = 0.0
    private var targetLon: Double = 0.0
    
    fun startTracking(lat: Double, lon: Double) {
        targetLat = lat
        targetLon = lon
        
        val locationRequest = LocationRequest.create().apply {
            interval = 10000 // 10 seconds
            fastestInterval = 5000
            priority = LocationRequest.PRIORITY_HIGH_ACCURACY
        }
        
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }
    
    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val currentLocation = result.lastLocation ?: return
            val distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            )
            
            // Update notification with new distance
            TripNotificationModule.updateDistance(distance)
            
            // Check if within 50m radius
            if (distance < 0.05) {
                // Anchor reached!
                vibrate()
                showAnchorReachedDialog()
            }
        }
    }
}
```

## PWA Fallback (Current MVP)

Since PWA cannot access Android foreground services, the MVP uses:
- **Standard notifications** with Notification API
- **Service worker** for background notifications
- **Web App Manifest** for "Add to Home Screen"
- **localStorage** for trip persistence

See `apps/web/lib/deviceAPI.ts` for current implementation.

## Future Enhancements

- Real-time distance calculations
- Turn-by-turn directions (integrate Google Maps Directions API)
- Geofencing alerts (when entering/exiting zones)
- Battery-optimized location updates
- Offline map tiles integration
- Wear OS complication support

## Build Instructions (For Future Implementation)

### 1. Set up React Native
```bash
npx react-native init UnmappedOSNative
cd UnmappedOSNative/android
```

### 2. Add Gradle Dependencies
```gradle
// android/app/build.gradle
dependencies {
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    implementation 'androidx.work:work-runtime-ktx:2.8.1'
}
```

### 3. Request Runtime Permissions
```kotlin
ActivityCompat.requestPermissions(
    this,
    arrayOf(
        Manifest.permission.POST_NOTIFICATIONS,
        Manifest.permission.FOREGROUND_SERVICE,
        Manifest.permission.ACCESS_FINE_LOCATION
    ),
    REQUEST_CODE
)
```

## References

- [Android Foreground Services](https://developer.android.com/guide/components/foreground-services)
- [Notification Best Practices](https://developer.android.com/develop/ui/views/notifications)
- [Fused Location Provider](https://developers.google.com/android/reference/com/google/android/gms/location/FusedLocationProviderClient)
- [React Native Android Native Modules](https://reactnative.dev/docs/native-modules-android)
