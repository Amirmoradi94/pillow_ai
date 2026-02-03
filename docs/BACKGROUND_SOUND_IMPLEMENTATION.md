# Background Sound Implementation

## Overview
Implemented ambient background sound feature for voice agents, similar to Retell AI's background sound functionality. This feature allows agents to play realistic environment sounds during calls to make conversations more natural and engaging.

## Features Implemented

### 1. Background Sound Options
Created a comprehensive set of ambient sound options:
- **None** - No background sound (default)
- **Coffee Shop** - Coffee shop ambience with people chatting
- **Convention Hall** - Convention hall with echo and background chatter
- **Summer Outdoor** - Summer outdoor ambience with cicada chirping
- **Mountain Outdoor** - Mountain outdoor with birds singing
- **Static Noise** - Constant static noise
- **Call Center** - Call center work noise

### 2. Volume Control
- Adjustable volume range: 0 to 2
  - 0 = quieter ambient sound
  - 1 = default volume
  - 2 = louder ambient sound
- Real-time slider with visual feedback

### 3. User Interface

#### Agent Creation Page
- Background sound dropdown selector in the configuration step
- Dynamic volume slider (only shows when a sound is selected)
- Descriptive text explaining each sound option
- Volume display showing current value

#### Agent Edit Page
- Background sound settings in the "Configuration" tab
- Same UI components as creation page
- Loads existing background sound settings from saved agents
- Updates are immediately saved to the agent

### 4. API Integration

#### Database Schema
Background sound settings are stored in the `voice_agents` table within the `settings` JSON field:
```json
{
  "voice_model": "...",
  "language": "en-US",
  "response_speed": "medium",
  "ambient_sound": "coffee-shop",
  "ambient_sound_volume": 1.0
}
```

#### Retell AI Integration
The implementation integrates with Retell AI's ambient sound API:
- `ambient_sound` parameter: The background sound type
- `ambient_sound_volume` parameter: Volume level (0-2)
- Supports both agent creation and updates
- Automatically removes ambient sound when set to "none"

## Files Modified

### New Files
- `lib/background-sounds.ts` - Type definitions and constants for background sounds

### Modified Files
1. **Frontend Components**
   - `app/dashboard/agents/new/page.tsx` - Added background sound selector to agent creation
   - `app/dashboard/agents/[id]/page.tsx` - Added background sound selector to agent editing

2. **Backend API**
   - `lib/retell/client.ts` - Updated `createRetellAgent` and `updateRetellAgent` to support ambient sound
   - `app/api/agents/route.ts` - Pass ambient sound parameters during agent creation
   - `app/api/agents/[id]/route.ts` - Pass ambient sound parameters during agent updates

## Usage

### Creating an Agent with Background Sound
1. Navigate to "Create New Agent"
2. Select a template
3. In the configuration step, find "Background Sound" dropdown
4. Select desired ambient sound (e.g., "Coffee Shop")
5. Adjust the volume slider if needed (optional)
6. Complete agent creation as normal

### Updating Agent Background Sound
1. Navigate to agent edit page
2. Click on "Configuration" tab
3. Change the "Background Sound" dropdown
4. Adjust volume if needed
5. Click "Save Changes"

## Technical Details

### Type Safety
```typescript
export type BackgroundSound =
  | 'none'
  | 'coffee-shop'
  | 'convention-hall'
  | 'summer-outdoor'
  | 'mountain-outdoor'
  | 'static-noise'
  | 'call-center';
```

### Default Values
- Default background sound: `'none'`
- Default volume: `1.0`

### API Parameters
When creating or updating an agent:
```javascript
{
  settings: {
    ambient_sound: "coffee-shop",      // Only sent if not 'none'
    ambient_sound_volume: 1.5          // Only sent if ambient_sound is set
  }
}
```

## Benefits

1. **More Natural Conversations** - Background sounds make AI calls feel more realistic
2. **Professional Context** - Call center sounds add legitimacy to support calls
3. **Scenario Matching** - Different sounds for different use cases (e.g., outdoor for delivery agents)
4. **User Control** - Full control over sound type and volume level
5. **Easy to Use** - Simple dropdown and slider interface

## Related Documentation
- [Retell AI Background Sound Documentation](https://docs.retellai.com/api-references/create-agent)
- Retell AI API parameters: `ambient_sound`, `ambient_sound_volume`
