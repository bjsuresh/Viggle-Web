import { Injectable, signal, computed } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface AppSettings {
  serverUrl: string;
  appToken: string;
  defaultQuality: 'low' | 'high';
  defaultResolution: '480p' | '768p' | '1080p' | '2k' | '4k';
  defaultAspect: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
  watermark: boolean;
  pollIntervalMs: number;
}

const KEY = 'vs.settings';

const DEFAULTS: AppSettings = {
  serverUrl: Capacitor.isNativePlatform() ? 'https://viggle-studio-api.onrender.com' : 'http://localhost:3000',
  appToken: '',
  defaultQuality: 'high',
  defaultResolution: '768p',
  defaultAspect: '9:16',
  watermark: false,
  pollIntervalMs: 4000,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<AppSettings>(DEFAULTS);
  readonly loaded = signal(false);
  readonly serverUrl = computed(() => this.settings().serverUrl.replace(/\/+$/, ''));
  readonly configured = computed(() => !!this.settings().serverUrl);

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) this.settings.set({ ...DEFAULTS, ...JSON.parse(value) });
    } catch {
      /* keep defaults */
    } finally {
      this.loaded.set(true);
    }
  }

  async update(patch: Partial<AppSettings>): Promise<void> {
    const next = { ...this.settings(), ...patch };
    this.settings.set(next);
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  }

  /** Absolute URL for a backend path (used for media proxy links and stitched outputs). */
  absolute(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.serverUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /** Route a signed Viggle URL through the backend so downloads and the web build work. */
  proxied(url: string, filename?: string): string {
    const q = new URLSearchParams({ url });
    if (filename) q.set('filename', filename);
    if (this.settings().appToken) q.set('token', this.settings().appToken);
    return `${this.serverUrl()}/api/media/proxy?${q.toString()}`;
  }
}
