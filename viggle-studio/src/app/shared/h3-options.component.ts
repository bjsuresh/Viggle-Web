import { Component, computed, inject, model } from '@angular/core';
import { IonRange, IonToggle, IonInput, IonItem, IonLabel, IonList, IonNote } from '@ionic/angular';
import { OptionChipsComponent } from './option-chips.component';
import { ASPECT_RATIOS, AspectRatio, VIDEO_RESOLUTIONS, VideoQuality, VideoResolution } from '../core/models';
import { SettingsService } from '../core/settings.service';
import { h3VideoCredits } from '../core/pricing';

export interface H3Options {
  quality: VideoQuality;
  duration_s: number;
  resolution: VideoResolution;
  aspect_ratio: AspectRatio;
  seed: string;
  enhance: boolean;
  priority: 1000 | 0;
}

export function defaultH3(settings: SettingsService): H3Options {
  const s = settings.settings();
  return { quality: s.defaultQuality, duration_s: 5, resolution: s.defaultResolution, aspect_ratio: s.defaultAspect, seed: '', enhance: true, priority: 1000 };
}

/** Shared H3 generation controls: quality, duration, resolution, aspect ratio, seed, prompt enhancer, queue priority. */
@Component({
  selector: 'vs-h3-options',
  imports: [IonRange, IonToggle, IonInput, IonItem, IonLabel, IonList, IonNote, OptionChipsComponent],
  template: `
    <div class="vs-field">
      <div class="vs-label">Quality <small>same price</small></div>
      <vs-option-chips
        [options]="[{ value: 'high', label: 'High', hint: 'best fidelity' }, { value: 'low', label: 'Low', hint: 'faster' }]"
        [value]="value().quality" (valueChange)="set('quality', $event)"></vs-option-chips>
    </div>
    <div class="vs-field">
      <div class="vs-label">Duration <small>{{ value().duration_s }} s · {{ credits() }} credits</small></div>
      <ion-range min="5" max="15" step="1" snaps="true" ticks="false" pin="true" [value]="value().duration_s"
        (ionChange)="set('duration_s', $any($event).detail.value)"></ion-range>
    </div>
    <div class="vs-field">
      <div class="vs-label">Resolution <small>{{ value().resolution === '4k' ? '5 cr/s' : '1 cr/s' }}</small></div>
      <vs-option-chips [options]="resOptions" [value]="value().resolution" (valueChange)="set('resolution', $event)"></vs-option-chips>
    </div>
    <div class="vs-field">
      <div class="vs-label">Aspect ratio</div>
      <vs-option-chips [options]="arOptions" [value]="value().aspect_ratio" (valueChange)="set('aspect_ratio', $event)"></vs-option-chips>
    </div>
    <details class="vs-advanced">
      <summary>Advanced</summary>
      <ion-list lines="none" class="vs-stack">
        <ion-item>
          <ion-toggle [checked]="value().enhance" (ionChange)="set('enhance', $any($event).detail.checked)">
            <ion-label>AI prompt enhancer</ion-label>
            <ion-note>Planner rewrites your prompt before generation</ion-note>
          </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-toggle [checked]="value().priority === 1000" (ionChange)="set('priority', $any($event).detail.checked ? 1000 : 0)">
            <ion-label>Standard queue priority</ion-label>
            <ion-note>Off = low priority (no wait estimate)</ion-note>
          </ion-toggle>
        </ion-item>
        <ion-item>
          <ion-input label="Seed (optional)" labelPlacement="stacked" type="number" inputmode="numeric" placeholder="random"
            [value]="value().seed" (ionInput)="set('seed', $any($event).detail.value ?? '')"></ion-input>
        </ion-item>
      </ion-list>
    </details>
  `,
})
export class H3OptionsComponent {
  private readonly settings = inject(SettingsService);
  readonly value = model<H3Options>(defaultH3(this.settings));
  readonly resOptions = VIDEO_RESOLUTIONS.map((r) => ({ value: r, label: r, hint: r === '4k' ? '5 cr/s' : undefined }));
  readonly arOptions = ASPECT_RATIOS.map((a) => ({ value: a, label: a }));
  readonly credits = computed(() => h3VideoCredits(this.value().duration_s, this.value().resolution));

  set<K extends keyof H3Options>(key: K, v: H3Options[K] | undefined): void {
    if (v === undefined) return;
    this.value.update((o) => ({ ...o, [key]: v }));
  }
}

/** Convert the options to the multipart fields Viggle expects. */
export function h3Fields(o: H3Options, watermark: boolean): Record<string, string | number | boolean> {
  const f: Record<string, string | number | boolean> = {
    quality: o.quality,
    duration_s: o.duration_s,
    resolution: o.resolution,
    aspect_ratio: o.aspect_ratio,
    enhance: o.enhance,
    priority: o.priority,
    watermark,
  };
  if (o.seed.trim() !== '') f['seed'] = Number(o.seed);
  return f;
}
