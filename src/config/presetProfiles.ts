export interface PresetProfileConfig {
  id: string;
  name: string;
  avatar: string;
}

export const PRESET_PROFILES: PresetProfileConfig[] = [
  {
    id: 'maison',
    name: 'Maison (Salon)',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Maison',
  },
  {
    id: 'bastien',
    name: 'Bastien',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bastien',
  },
];
