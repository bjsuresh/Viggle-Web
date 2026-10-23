import { Component, inject, input, model, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonIcon, IonButton, IonInput } from '@ionic/angular';
import { MediaService, PickedMedia } from '../core/media.service';
import { ToastService } from '../core/toast.service';

/**
 * Card that lets the user attach images or a video either from the device or by public URL.
 * Exposes `files` (PickedMedia[]) and `url` (string) models; the page decides which to send.
 */
@Component({
  selector: 'vs-media-picker',
  imports: [IonIcon, IonButton, IonInput, DecimalPipe],
  template: `
    <div class="picker">
      <div class="picker-head">
        <div>
          <div class="picker-title">{{ title() }}</div>
          @if (hint()) {
            <div class="picker-hint">{{ hint() }}</div>
          }
        </div>
        <button type="button" class="mode" (click)="useUrl.set(!useUrl())">
          <ion-icon [name]="useUrl() ? 'cloud-upload' : 'link'"></ion-icon>
          {{ useUrl() ? 'Upload' : 'Use URL' }}
        </button>
      </div>

      @if (useUrl()) {
        <ion-input
          class="url"
          fill="outline"
          [placeholder]="kind() === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg'"
          [value]="url()"
          (ionInput)="url.set($any($event).detail.value ?? '')"
          inputmode="url"
          autocapitalize="off"
        ></ion-input>
      } @else {
        @if (files().length) {
          <div class="thumbs" [class.single]="max() === 1">
            @for (f of files(); track f.previewUrl; let i = $index) {
              <div class="thumb">
                @if (f.kind === 'video') {
                  <video [src]="f.previewUrl" muted playsinline preload="metadata"></video>
                  <span class="badge">{{ f.durationS ? (f.durationS | number: '1.0-1') + 's' : 'video' }}</span>
                } @else {
                  <img [src]="f.previewUrl" alt="" />
                }
                <button type="button" class="remove" (click)="remove(i)" aria-label="Remove">
                  <ion-icon name="close"></ion-icon>
                </button>
              </div>
            }
          </div>
        }
        @if (files().length < max()) {
          <div class="actions">
            <ion-button size="small" fill="outline" (click)="pick()">
              <ion-icon slot="start" [name]="kind() === 'video' ? 'videocam' : 'images'"></ion-icon>
              {{ kind() === 'video' ? 'Choose video' : max() > 1 ? 'Choose images' : 'Choose image' }}
            </ion-button>
            @if (kind() === 'image' && media.isNative) {
              <ion-button size="small" fill="outline" (click)="snap()">
                <ion-icon slot="start" name="camera"></ion-icon>
                Camera
              </ion-button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .picker { background: var(--vs-surface); border: 1px dashed var(--vs-border-strong); border-radius: 16px; padding: 14px; }
      .picker-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
      .picker-title { font-weight: 700; font-size: 14px; }
      .picker-hint { font-size: 12px; color: var(--vs-muted); margin-top: 2px; }
      .mode { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 12px; font-weight: 600; color: var(--vs-secondary); background: none; border: 0; padding: 4px 0; cursor: pointer; white-space: nowrap; }
      .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; margin-bottom: 10px; }
      .thumbs.single { grid-template-columns: 1fr; }
      .thumb { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #000; }
      .thumbs.single .thumb { aspect-ratio: 16 / 10; }
      .thumb img, .thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .remove { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,.65); color: #fff; display: grid; place-items: center; cursor: pointer; }
      .badge { position: absolute; left: 8px; bottom: 8px; font-size: 11px; font-weight: 700; background: rgba(0,0,0,.6); color: #fff; padding: 2px 8px; border-radius: 999px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      ion-input.url { --background: var(--vs-surface-2); --border-radius: 12px; }
    `,
  ],
})
export class MediaPickerComponent {
  readonly media = inject(MediaService);
  private readonly toast = inject(ToastService);

  readonly title = input.required<string>();
  readonly hint = input<string>('');
  readonly kind = input<'image' | 'video'>('image');
  readonly max = input<number>(1);

  readonly files = model<PickedMedia[]>([]);
  readonly url = model<string>('');
  readonly useUrl = signal(false);

  async pick(): Promise<void> {
    try {
      if (this.kind() === 'video') {
        const v = await this.media.pickVideo();
        if (v) this.files.set([v]);
      } else {
        const remaining = this.max() - this.files().length;
        const picked = await this.media.pickImages(remaining);
        if (picked.length) this.files.update((f) => [...f, ...picked].slice(0, this.max()));
      }
    } catch (e) {
      await this.toast.error(e, 'Could not open the picker');
    }
  }

  async snap(): Promise<void> {
    try {
      const p = await this.media.takePhoto();
      if (p) this.files.update((f) => [...f, p].slice(0, this.max()));
    } catch (e) {
      await this.toast.error(e, 'Camera unavailable');
    }
  }

  remove(i: number): void {
    this.files.update((f) => f.filter((_, idx) => idx !== i));
  }
}
