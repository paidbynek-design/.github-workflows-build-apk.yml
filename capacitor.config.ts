import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ducky.app',
  appName: 'DUCKY',
  webDir: 'out',
  android: {
    allowMixedContent: true,
  },
}

export default config
