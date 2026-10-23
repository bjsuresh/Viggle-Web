import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonTextarea, IonToggle, IonItem, IonLabel, IonNote } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { H3Options, H3OptionsComponent, defaultH3, h3Fields } from '../../shared/h3-options.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { h3VideoCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-image-to-video',
  imports: [IonContent, IonTextarea, IonToggle, IonItem, IonLabel, IonNote, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, H3OptionsComponent],
  template: `
    <vs-page-header title="Image to Video" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-stack" style="margin-top: 8px">
        <vs-media-picker title="First frame" hint="JPEG, PNG, WebP, HEIC… up to 20 MiB. The video starts on this image." kind="image"
          [(files)]="firstFiles" [(url)]="firstUrl"></vs-media-picker>
        <ion-item lines="none" style="--background: transparent; --padding-start: 4px">
          <ion-toggle [checked]="useLast()" (ionChange)="useLast.set($any($event).detail.checked)">
            <ion-label>Add a last frame</ion-label>
            <ion-note>Interpolate from first to last image</ion-note>
          </ion-toggle>
        </ion-item>
        @if (useLast()) {
          <vs-media-picker title="Last frame" hint="The video ends on this image." kind="image" [(files)]="lastFiles" [(url)]="lastUrl"></vs-media-picker>
        }
      </div>
      <div class="vs-field" style="margin-top: 18px">
        <div class="vs-label">Prompt <small>required</small></div>
        <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="3"
          placeholder="What happens in the shot? Camera move, motion, mood, sound…"></ion-textarea>
      </div>
      <vs-h3-options [(value)]="opts"></vs-h3-options>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Animate" [disabled]="!valid()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
})
export class ImageToVideoPage extends ToolBase {
  private readonly route = inject(ActivatedRoute);
  readonly prompt = signal('');
  readonly useLast = signal(false);
  readonly firstFiles = signal<PickedMedia[]>([]);
  readonly firstUrl = signal('');
  readonly lastFiles = signal<PickedMedia[]>([]);
  readonly lastUrl = signal('');
  readonly opts = signal<H3Options>(defaultH3(this.settings));
  readonly cost = computed(() => h3VideoCredits(this.opts().duration_s, this.opts().resolution));

  constructor() {
    super();
    const first = this.route.snapshot.queryParamMap.get('first');
    if (first) this.firstUrl.set(first);
  }

  valid(): boolean {
    const first = this.firstFiles().length > 0 || !!this.firstUrl().trim();
    const last = !this.useLast() || this.lastFiles().length > 0 || !!this.lastUrl().trim();
    return first && last && !!this.prompt().trim();
  }

  async generate(): Promise<void> {
    const fields: FormInput = { prompt: this.prompt().trim(), ...h3Fields(this.opts(), this.settings.settings().watermark) };
    if (this.firstFiles()[0]) fields['first_frame_image'] = this.firstFiles()[0].file;
    else fields['first_frame_image_url'] = this.firstUrl().trim();
    if (this.useLast()) {
      if (this.lastFiles()[0]) fields['last_frame_image'] = this.lastFiles()[0].file;
      else fields['last_frame_image_url'] = this.lastUrl().trim();
    }
    await this.run(() => this.api.createVideo(fields), {
      kind: 'video',
      tool: this.useLast() ? 'First–Last Frame' : 'Image to Video',
      title: this.prompt().trim(),
      params: { ...fields, first_frame_image: undefined, last_frame_image: undefined },
      estimatedCredits: this.cost(),
      thumbnail: this.firstFiles()[0]?.previewUrl ?? (this.firstUrl() || null),
    });
  }
}
