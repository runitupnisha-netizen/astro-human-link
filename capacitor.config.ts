import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    url: 'https://19cbe756-bc12-49f3-a656-4faee8b3ae3a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
