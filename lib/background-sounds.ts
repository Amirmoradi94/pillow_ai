export type BackgroundSound =
  | 'none'
  | 'coffee-shop'
  | 'convention-hall'
  | 'summer-outdoor'
  | 'mountain-outdoor'
  | 'static-noise'
  | 'call-center';

export interface BackgroundSoundOption {
  value: BackgroundSound;
  label: string;
  description: string;
}

export const BACKGROUND_SOUNDS: BackgroundSoundOption[] = [
  {
    value: 'none',
    label: 'None',
    description: 'No background sound'
  },
  {
    value: 'coffee-shop',
    label: 'Coffee Shop',
    description: 'Coffee shop ambience with people chatting'
  },
  {
    value: 'convention-hall',
    label: 'Convention Hall',
    description: 'Convention hall with echo and background chatter'
  },
  {
    value: 'summer-outdoor',
    label: 'Summer Outdoor',
    description: 'Summer outdoor ambience with cicada chirping'
  },
  {
    value: 'mountain-outdoor',
    label: 'Mountain Outdoor',
    description: 'Mountain outdoor with birds singing'
  },
  {
    value: 'static-noise',
    label: 'Static Noise',
    description: 'Constant static noise'
  },
  {
    value: 'call-center',
    label: 'Call Center',
    description: 'Call center work noise'
  }
];

export const DEFAULT_BACKGROUND_SOUND: BackgroundSound = 'none';
export const DEFAULT_BACKGROUND_SOUND_VOLUME = 1.0; // Range: 0-2
