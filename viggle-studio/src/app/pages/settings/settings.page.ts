import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonItem, IonInput, IonToggle, IonButton, IonIcon, IonList, IonNote, IonLabel } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { SettingsService } from '../../core/settings.service';
import { ApiService } from '../../core/api.service';
import { CreditsService } from '../../core/credits.service';
import { ToastService } from '../../core/toast.service';
import { MediaService } from '../../core/media.service';
import { ASPECT_RATIOS, VIDEO_RESOLUTIONS } from '../../core/models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, IonContent, IonItem, IonInput, IonToggle, IonButton, IonIcon, IonList, IonNote, IonLabel, PageHeaderComponent, OptionChipsComponent],
  template: `
    <vs-page-header title="Settings"></vs-page-header>
    <ion-content>
      <div class="vs-section">
        <div class="vs-section-title">Backend server</div>
        <div class="vs-card vs-stack">
          <ion-input label="Server URL" labelPlacement="stacked" fill="outline" inputmode="url" autocapitalize="off"
            placeholder="http://192.168.1.10:3000" [value]="s.settings().serverUrl"
            (ionChange)="save({ serverUrl: $any($event).detail.value })"></ion-input>
          <ion-input label="App token (x-app-token)" labelPlacement="stacked" fill="outline" type="password" autocapitalize="off"
            placeholder="matches APP_ACCESS_TOKEN on the server" [value]="s.settings().appToken"
            (ionChange)="save({ appToken: $any($event).detail.value })"></ion-input>
          <div class="vs-row">
            <ion-button size="small" fill="outline" (click)="test()" [disabled]="testing()">
              <ion-icon slot="start" name="flash"></ion-icon>{{ testing() ? 'Testing…' : 'Test connection' }}
            </ion-button>
            @if (health(); as h) {
              <span class="vs-pill" [class.ok]="h.ok && h.viggleKey" [class.bad]="!h.viggleKey">
                {{ h.viggleKey ? 'Viggle key OK' : 'No Viggle key on server' }}{{ h.storyAi ? ' · AI stories' : '' }}
              </span>
            }
          </div>
          <p class="vs-help">
            The Viggle API key lives only on your Node server (never in the app). On a phone, use your computer's LAN IP or a deployed URL.
          </p>
        </div>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Generation defaults</div>
        <div class="vs-card vs-stack">
          <div class="vs-field">
            <div class="vs-label">Quality</div>
            <vs-option-chips [options]="[{ value: 'high', label: 'High', hint: 'fidelity' }, { value: 'low', label: 'Low', hint: 'faster' }]"
              [value]="s.settings().defaultQuality" (valueChange)="save({ defaultQuality: $any($event) })"></vs-option-chips>
          </div>
          <div class="vs-field">
            <div class="vs-label">Resolution</div>
            <vs-option-chips [options]="resOptions" [value]="s.settings().defaultResolution" (valueChange)="save({ defaultResolution: $any($event) })"></vs-option-chips>
          </div>
          <div class="vs-field">
            <div class="vs-label">Aspect ratio</div>
            <vs-option-chips [options]="arOptions" [value]="s.settings().defaultAspect" (valueChange)="save({ defaultAspect: $any($event) })"></vs-option-chips>
          </div>
          <ion-list lines="none">
            <ion-item>
              <ion-toggle [checked]="s.settings().watermark" (ionChange)="save({ watermark: $any($event).detail.checked })">
                <ion-label>Burn in Viggle watermark</ion-label>
                <ion-note>Off = clean output (API default)</ion-note>
              </ion-toggle>
            </ion-item>
          </ion-list>
          <ion-input label="Status poll interval (ms)" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric"
            [value]="s.settings().pollIntervalMs" (ionChange)="save({ pollIntervalMs: clamp($any($event).detail.value) })"></ion-input>
        </div>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Account</div>
        <div class="vs-card vs-stack">
          <div class="vs-row">
            <div>
              <div style="font-weight:700">Credits</div>
              <div class="vs-help">1 credit = $0.01 · failed jobs are refunded</div>
            </div>
            <div style="font-size:22px;font-weight:900">{{ credits.balance() ?? '—' }}</div>
          </div>
          <ion-button fill="outline" size="small" (click)="media.openExternal('https://portal.viggle.ai')">
            <ion-icon slot="start" name="wallet"></ion-icon>Open Viggle dashboard
          </ion-button>
        </div>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">About</div>
        <div class="vs-card">
          <p class="vs-help" style="margin:0">
            Viggle Studio uses the Viggle V1 API: H3 video (text, first/last frame, reference), Viggle Animate, Video Remix, 2× upscale,
            Viggle Image, Characters &amp; Motions (2D + 3D export), Scene Model and a Story Studio that chains keyframes → clips → one film.
            Signed result links expire after one hour; reopen a job to refresh them.
          </p>
        </div>
      </div>
      <div style="height: 24px"></div>
    </ion-content>
  `,
})
export class SettingsPage {
  readonly s = inject(SettingsService);
  readonly credits = inject(CreditsService);
  readonly media = inject(MediaService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly testing = signal(false);
  readonly health = signal<{ ok: boolean; viggleKey: boolean; storyAi: boolean } | null>(null);
  readonly resOptions = VIDEO_RESOLUTIONS.map((r) => ({ value: r, label: r, hint: r === '4k' ? '5 cr/s' : '1 cr/s' }));
  readonly arOptions = ASPECT_RATIOS.map((a) => ({ value: a, label: a }));

  async save(patch: Parameters<SettingsService['update']>[0]): Promise<void> {
    await this.s.update(patch);
  }

  clamp(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1500), 30000) : 4000;
  }

  async test(): Promise<void> {
    this.testing.set(true);
    try {
      const h = await this.api.health();
      this.health.set(h);
      await this.credits.refresh();
      if (this.credits.error()) await this.toast.show(`Server reachable, but credits failed: ${this.credits.error()}`, 'warning');
      else await this.toast.success('Connected');
    } catch (e) {
      this.health.set(null);
      await this.toast.error(e, 'Server unreachable');
    } finally {
      this.testing.set(false);
    }
  }
}
