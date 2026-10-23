import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { upscaleCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-upscale',
  imports: [IonContent, IonIcon, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent],
  template: `
    <vs-page-header title="Upscale 2×" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-hero" style="margin-top: 8px">
        <h1>FlashVSR super-resolution</h1>
        <p>Fixed 2× upscale: 480p → ~1080p, 768p → ~2K, 1080p → ~4K. 1 credit per second of source.</p>
      </div>
      <div style="margin-top: 16px">
        <vs-media-picker title="Source video" hint="0.5–600 s, up to 100 MiB, even dimensions. Or paste a Viggle result URL." kind="video"
          [(files)]="files" [(url)]="url"></vs-media-picker>
      </div>
      @if (fromJob()) {
        <p class="vs-help"><ion-icon name="link"></ion-icon> Source pre-filled from job {{ fromJob() }}.</p>
      }
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Upscale" [disabled]="!valid()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
})
export class UpscalePage extends ToolBase {
  private readonly route = inject(ActivatedRoute);
  readonly files = signal<PickedMedia[]>([]);
  readonly url = signal('');
  readonly fromJob = signal<string | null>(null);
  readonly cost = computed(() => upscaleCredits(this.files()[0]?.durationS ?? 5));

  constructor() {
    super();
    const q = this.route.snapshot.queryParamMap;
    const url = q.get('url');
    if (url) {
      this.url.set(url);
      this.fromJob.set(q.get('from'));
    }
  }

  valid(): boolean {
    return this.files().length > 0 || !!this.url().trim();
  }

  async generate(): Promise<void> {
    const fields: FormInput = { watermark: this.settings.settings().watermark };
    if (this.files()[0]) fields['video'] = this.files()[0].file;
    else fields['video_url'] = this.url().trim();
    await this.run(() => this.api.upscaleVideo(fields), {
      kind: 'video',
      tool: 'Upscale 2×',
      title: this.files()[0]?.file.name ?? 'Upscaled video',
      estimatedCredits: this.cost(),
    });
  }
}
