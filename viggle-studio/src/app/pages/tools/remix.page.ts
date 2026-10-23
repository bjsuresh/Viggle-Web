import { Component, computed, signal } from '@angular/core';
import { IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonIcon, IonSpinner } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { Asset, BackgroundMode, VIGGLE_MODELS, ViggleModel } from '../../core/models';
import { remixCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

type Source = 'upload' | 'saved';

@Component({
  selector: 'app-remix',
  imports: [IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonIcon, IonSpinner, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, OptionChipsComponent],
  template: `
    <vs-page-header title="Video Remix" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-section" style="margin-top: 4px">
        <div class="vs-section-title">1 · Character</div>
        <ion-segment [value]="charSource()" (ionChange)="charSource.set($any($event).detail.value)" style="margin-bottom: 10px">
          <ion-segment-button value="upload"><ion-label>Image</ion-label></ion-segment-button>
          <ion-segment-button value="saved"><ion-label>Saved character</ion-label></ion-segment-button>
        </ion-segment>
        @if (charSource() === 'upload') {
          <vs-media-picker title="Character image" hint="A clear full-body photo or illustration of one person." kind="image" [(files)]="charFiles" [(url)]="charUrl"></vs-media-picker>
        } @else {
          <div class="vs-card">
            @if (loadingAssets()) {
              <div class="vs-row"><ion-spinner name="dots"></ion-spinner><span class="vs-help">Loading characters…</span></div>
            } @else if (!characters().length) {
              <p class="vs-help" style="margin:0">No ready characters yet. Create one under Create → Characters.</p>
            } @else {
              <div class="asset-grid">
                @for (c of characters(); track c.id) {
                  <button type="button" class="asset" [class.active]="charId() === c.id" (click)="charId.set(c.id)">
                    <ion-icon name="person"></ion-icon>
                    <span class="a-name">{{ c.name || c.id }}</span>
                    <span class="a-id">{{ c.id }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="vs-section">
        <div class="vs-section-title">2 · Motion</div>
        <ion-segment [value]="motionSource()" (ionChange)="motionSource.set($any($event).detail.value)" style="margin-bottom: 10px">
          <ion-segment-button value="upload"><ion-label>Video</ion-label></ion-segment-button>
          <ion-segment-button value="saved"><ion-label>Saved motion</ion-label></ion-segment-button>
        </ion-segment>
        @if (motionSource() === 'upload') {
          <vs-media-picker title="Motion video" hint="A video of a person moving. The character copies this motion." kind="video" [(files)]="motionFiles" [(url)]="motionUrl"></vs-media-picker>
        } @else {
          <div class="vs-card">
            @if (loadingAssets()) {
              <div class="vs-row"><ion-spinner name="dots"></ion-spinner><span class="vs-help">Loading motions…</span></div>
            } @else if (!motions().length) {
              <p class="vs-help" style="margin:0">No ready motions yet. Create or import one under Create → Motions.</p>
            } @else {
              <div class="asset-grid">
                @for (m of motions(); track m.id) {
                  <button type="button" class="asset" [class.active]="motionId() === m.id" (click)="motionId.set(m.id)">
                    <ion-icon name="body"></ion-icon>
                    <span class="a-name">{{ m.name || m.id }}</span>
                    <span class="a-id">{{ m.id }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="vs-section">
        <div class="vs-section-title">3 · Output</div>
        <div class="vs-field">
          <div class="vs-label">Background</div>
          <vs-option-chips [options]="bgOptions" [value]="bg()" (valueChange)="bg.set($any($event))"></vs-option-chips>
        </div>
        @if (bg() === 'solid') {
          <div class="vs-field">
            <div class="vs-label">Background color <small>{{ rgb() }}</small></div>
            <div class="color-row">
              <input type="color" [value]="hex()" (input)="hex.set($any($event).target.value)" aria-label="Background color" />
              @for (p of presets; track p) {
                <button type="button" class="swatch" [style.background]="p" (click)="hex.set(p)" [attr.aria-label]="p"></button>
              }
            </div>
          </div>
        }
        @if (bg() === 'transparent') {
          <p class="vs-help">Transparent mode returns a second alpha-matte video (alpha_url) you can composite in any editor.</p>
        }
        <details class="vs-advanced">
          <summary>Advanced</summary>
          <div class="vs-field">
            <div class="vs-label">Model</div>
            <vs-option-chips [options]="modelOptions" [value]="model()" (valueChange)="model.set($any($event))"></vs-option-chips>
          </div>
          <ion-input label="Background image URL (optional)" labelPlacement="stacked" fill="outline" inputmode="url" [value]="bgUrl()" (ionInput)="bgUrl.set($any($event).detail.value ?? '')"></ion-input>
        </details>
      </div>
      <p class="vs-help">Billed $0.01 per character per output second. Progress streams live on the job page.</p>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Remix" [disabled]="!valid()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
  styles: [
    `
      .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
      .asset { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px; border-radius: 12px; border: 1px solid var(--vs-border); background: var(--vs-surface-2); color: var(--vs-text); font: inherit; text-align: left; cursor: pointer; }
      .asset.active { border-color: var(--vs-primary); box-shadow: 0 0 0 2px rgba(124, 92, 255, .35); }
      .asset ion-icon { color: var(--vs-secondary); font-size: 20px; }
      .a-name { font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .a-id { font-size: 10px; color: var(--vs-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .color-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      input[type='color'] { width: 44px; height: 36px; border: 0; background: none; padding: 0; cursor: pointer; }
      .swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--vs-border-strong); cursor: pointer; }
    `,
  ],
})
export class RemixPage extends ToolBase {
  readonly charSource = signal<Source>('upload');
  readonly motionSource = signal<Source>('upload');
  readonly charFiles = signal<PickedMedia[]>([]);
  readonly charUrl = signal('');
  readonly charId = signal('');
  readonly motionFiles = signal<PickedMedia[]>([]);
  readonly motionUrl = signal('');
  readonly motionId = signal('');
  readonly bg = signal<BackgroundMode>('original');
  readonly hex = signal('#00b140');
  readonly bgUrl = signal('');
  readonly model = signal<ViggleModel | ''>('');
  readonly characters = signal<Asset[]>([]);
  readonly motions = signal<Asset[]>([]);
  readonly loadingAssets = signal(false);

  readonly presets = ['#00b140', '#0000ff', '#ffffff', '#000000', '#ff00ff'];
  readonly bgOptions = [
    { value: 'original', label: 'Original', hint: 'keep video bg' },
    { value: 'solid', label: 'Solid color', hint: 'green screen' },
    { value: 'transparent', label: 'Transparent', hint: '+ alpha video' },
  ];
  readonly modelOptions = [{ value: '', label: 'Default' }, ...VIGGLE_MODELS.map((m) => ({ value: m, label: m }))];
  readonly rgb = computed(() => {
    const h = this.hex().replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  });
  readonly cost = computed(() => remixCredits(this.motionFiles()[0]?.durationS ?? 10));

  constructor() {
    super();
    void this.loadAssets();
  }

  async loadAssets(): Promise<void> {
    this.loadingAssets.set(true);
    try {
      const [c, m] = await Promise.all([this.api.listCharacters(), this.api.listMotions()]);
      this.characters.set(c.data.filter((a) => a.status === 'ready' && a.capabilities.includes('video_render')));
      this.motions.set(m.data.filter((a) => a.status === 'ready' && a.capabilities.includes('video_render')));
    } catch {
      /* lists are optional; upload path still works */
    } finally {
      this.loadingAssets.set(false);
    }
  }

  valid(): boolean {
    const c = this.charSource() === 'saved' ? !!this.charId() : this.charFiles().length > 0 || !!this.charUrl().trim();
    const m = this.motionSource() === 'saved' ? !!this.motionId() : this.motionFiles().length > 0 || !!this.motionUrl().trim();
    return c && m;
  }

  async generate(): Promise<void> {
    const fields: FormInput = { background_mode: this.bg() };
    if (this.charSource() === 'saved') fields['character_id'] = this.charId();
    else if (this.charFiles()[0]) fields['image'] = this.charFiles()[0].file;
    else fields['image_url'] = this.charUrl().trim();
    if (this.motionSource() === 'saved') fields['motion_id'] = this.motionId();
    else if (this.motionFiles()[0]) fields['motion_video'] = this.motionFiles()[0].file;
    else fields['motion_video_url'] = this.motionUrl().trim();
    if (this.bg() === 'solid') fields['bg_color'] = this.rgb();
    if (this.model()) fields['model'] = this.model();
    if (this.bgUrl().trim()) fields['background_url'] = this.bgUrl().trim();
    await this.run(() => this.api.createRender(fields), {
      kind: 'render',
      tool: 'Video Remix',
      title: `Remix · ${this.bg()}${this.charId() ? ' · ' + this.charId() : ''}`,
      estimatedCredits: this.cost(),
      thumbnail: this.charFiles()[0]?.previewUrl ?? null,
    });
  }
}
