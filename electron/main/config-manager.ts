import { app } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_CONFIG, type ChatConfig } from '../../src/shared/chat-constants';

/**
 * Configuration Manager
 * Reads from .env file and provides config to the app
 */
export class ConfigManager {
  private config: ChatConfig;
  private apiKey: string = '';

  constructor() {
    // Load .env from project root or app path
    this.loadEnv();
    this.config = { ...DEFAULT_CONFIG };
  }

  private loadEnv(): void {
    try {
      // Try multiple paths for .env
      const envPaths = [
        join(process.cwd(), '.env'),
        join(__dirname, '../../.env'),
        join(app.getPath('userData'), '.env'),
      ];

      console.log('Looking for .env in:', envPaths);

      for (const envPath of envPaths) {
        try {
          const content = readFileSync(envPath, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) continue;

            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
              const key = trimmed.substring(0, equalIndex).trim();
              const value = trimmed.substring(equalIndex + 1).trim();

              if (key === 'GLM_API_KEY') {
                this.apiKey = value;
                console.log('✅ Loaded API key from:', envPath);
              }
              if (key === 'GLM_MODEL' && value) {
                // Override model if set
              }
            }
          }
          if (this.apiKey) {
            console.log('Loaded .env from:', envPath);
            break;
          }
        } catch (e) {
          // File doesn't exist, try next path
          console.log('No .env at:', envPath);
        }
      }

      if (!this.apiKey) {
        console.warn('⚠️ No GLM_API_KEY found in .env');
      }

      // Also check environment variable
      if (!this.apiKey && process.env.GLM_API_KEY) {
        this.apiKey = process.env.GLM_API_KEY;
        console.log('✅ Loaded API key from environment variable');
      }
    } catch (error) {
      console.error('Error loading .env:', error);
    }
  }

  getConfig(): ChatConfig {
    return { ...this.config };
  }

  getApiKey(): string {
    return this.apiKey;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  updateConfig(partial: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}
