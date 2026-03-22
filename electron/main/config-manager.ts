import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DEFAULT_CONFIG, type ChatConfig } from '../../src/shared/chat-constants';

/**
 * Configuration Manager
 * Reads from .env file and provides config to the app
 */
export class ConfigManager {
  private config: ChatConfig;
  private apiKey: string = '';
  private apiKeyListeners: Array<(key: string) => void> = [];

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

  /**
   * Update API key and notify listeners
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // Notify all listeners (LLMService)
    this.apiKeyListeners.forEach(listener => listener(apiKey));
    // Save to .env file for persistence
    this.saveApiKeyToEnv(apiKey);
  }

  /**
   * Register a listener for API key changes
   */
  onApiKeyChange(listener: (key: string) => void): () => void {
    this.apiKeyListeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.apiKeyListeners.indexOf(listener);
      if (index > -1) {
        this.apiKeyListeners.splice(index, 1);
      }
    };
  }

  /**
   * Save API key to .env file in userData directory
   */
  private saveApiKeyToEnv(apiKey: string): void {
    try {
      const userDataPath = app.getPath('userData');
      const envPath = join(userDataPath, '.env');

      // Read existing .env content
      let content = '';
      if (existsSync(envPath)) {
        content = readFileSync(envPath, 'utf-8');
      }

      // Update or add GLM_API_KEY line
      const lines = content.split('\n');
      const updatedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('GLM_API_KEY=')) {
          return false; // Remove old line
        }
        return true;
      });

      updatedLines.push(`GLM_API_KEY=${apiKey}`);

      // Write back
      writeFileSync(envPath, updatedLines.join('\n'), 'utf-8');
      console.log('✅ API Key saved to .env:', envPath);
    } catch (error) {
      console.error('Failed to save API key to .env:', error);
    }
  }
}
