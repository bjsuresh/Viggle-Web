import { Component, computed, signal } from '@angular/core';
import { IonContent, IonTextarea } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { H3Options, H3OptionsComponent, defaultH3, h3Fields } from '../../shared/h3-options.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { h3VideoCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-reference-to-video',
  imports: [IonContent, IonTextarea, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, H3OptionsComponent],
  template: `
    <vs-page-header title="Reference to Video" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-stack" style="margin-top: 8px">
        <vs-media-picker title="Reference images" hint="Up to 4 images that define characters, products or style." kind="image" [max]="4"
          [(files)]="imageFiles" [(url)]="imageUrl"></vs-media-picker>
        <vs-media-picker title="Reference video (optional)" hint="One clip, 0.5–600 s, up to 100 MiB. Guides motion and pacing." kind="video"
          [(files)]="videoFiles" [(url)]="videoUrl"></vs-media-picker>
      </div>
      <div class="vs-field" style="margin-top: 18px">
        <div class="vs-label">Prompt <small>required</small></div>
        <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="3"
          placeholder="Describe the new shot. Mention how the references should be used."></ion-textarea>
      </div>
      <vs-h3-options [(value)]="opts"></vs-h3-options>
      <p class="vs-help">Reference-conditioned generation costs the same as text-only. At least one reference (image or video) is required.</p>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Generate" [disabled]="!valid()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
})
export class ReferenceToVideoPage extends ToolBase {
  readonly prompt = signal('');
  readonly imageFiles = signal<PickedMedia[]>([]);
  readonly imageUrl = signal('');
  readonly videoFiles = signal<PickedMedia[]>([]);
  readonly videoUrl = signal('');
  readonly opts = signal<H3Options>(defaultH3(this.settings));
  readonly cost = computed(() => h3VideoCredits(this.opts().duration_s, this.opts().resolution));

  valid(): boolean {
    const hasRef = this.imageFiles().length > 0 || !!this.imageUrl().trim() || this.videoFiles().length > 0 || !!this.videoUrl().trim();
    return hasRef && !!this.prompt().trim();
  }

  async generate(): Promise<void> {
    const fields: FormInput = { prompt: this.prompt().trim(), ...h3Fields(this.opts(), this.settings.settings().watermark) };
    if (this.imageFiles().length) fields['reference_image'] = this.imageFiles().map((f) => f.file);
    if (this.imageUrl().trim()) fields['reference_image_url'] = this.imageUrl().split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
    if (this.videoFiles()[0]) fields['reference_video'] = this.videoFiles()[0].file;
    else if (this.videoUrl().trim()) fields['reference_video_url'] = this.videoUrl().trim();
    await this.run(() => this.api.createVideo(fields), {
      kind: 'video',
      tool: 'Reference to Video',
      title: this.prompt().trim(),
      estimatedCredits: this.cost(),
      thumbnail: this.imageFiles()[0]?.previewUrl ?? null,
    });
  }
}
