import { Component, computed, signal } from '@angular/core';
import { IonContent, IonTextarea } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { EnhanceMode } from '../../core/models';
import { animationCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-animate',
  imports: [IonContent, IonTextarea, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, OptionChipsComponent],
  template: `
    <vs-page-header title="Viggle Animate" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-stack" style="margin-top: 8px">
        <vs-media-picker title="Driving video" [hint]="mode() === 'agent' ? '5–60 s, up to 100 MiB. The motion to copy.' : '5–16 s, up to 100 MiB. The motion to copy.'"
          kind="video" [(files)]="videoFiles" [(url)]="videoUrl"></vs-media-picker>
        <vs-media-picker title="Character images" [hint]="mode() === 'agent' ? 'Up to 10 images. The agent decides how to use them.' : 'Up to 3 images, ordered. Use <Character1>, <Character2> tags in the prompt.'"
          kind="image" [max]="mode() === 'agent' ? 10 : 3" [(files)]="imageFiles" [(url)]="imageUrl"></vs-media-picker>
      </div>

      <div class="vs-field" style="margin-top: 18px">
        <div class="vs-label">Enhance mode</div>
        <vs-option-chips [options]="modes" [value]="mode()" (valueChange)="mode.set($any($event))"></vs-option-chips>
        <p class="vs-help">
          @switch (mode()) {
            @case ('planner') { AI planner writes the prompt and repaints pinned frames. Best default. }
            @case ('normal') { Repaints only the first frame with a fixed prompt. Fastest. }
            @case ('agent') { An AI agent performs a full edit from your instruction. Up to 60 s and 10 images. }
          }
        </p>
      </div>

      <div class="vs-field">
        <div class="vs-label">Instruction <small>optional</small></div>
        <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="3"
          [placeholder]="mode() === 'agent' ? 'e.g. Make <Character1> dance in a neon club wearing a silver jacket' : 'e.g. <Character1> replaces the dancer; keep the original background'"></ion-textarea>
      </div>
      <p class="vs-help">Billed 1 credit per second of driving video ({{ cost() }} credits for this clip). Output length matches the driving video.</p>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Animate" [disabled]="!valid()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
})
export class AnimatePage extends ToolBase {
  readonly prompt = signal('');
  readonly mode = signal<EnhanceMode>('planner');
  readonly videoFiles = signal<PickedMedia[]>([]);
  readonly videoUrl = signal('');
  readonly imageFiles = signal<PickedMedia[]>([]);
  readonly imageUrl = signal('');
  readonly modes = [
    { value: 'planner', label: 'Planner', hint: 'recommended' },
    { value: 'normal', label: 'Normal', hint: 'fast' },
    { value: 'agent', label: 'Agent', hint: 'up to 60 s' },
  ];
  readonly cost = computed(() => animationCredits(this.videoFiles()[0]?.durationS ?? 5));

  valid(): boolean {
    const v = this.videoFiles().length > 0 || !!this.videoUrl().trim();
    const i = this.imageFiles().length > 0 || !!this.imageUrl().trim();
    return v && i;
  }

  async generate(): Promise<void> {
    const fields: FormInput = { enhance_mode: this.mode(), watermark: this.settings.settings().watermark };
    if (this.prompt().trim()) fields['prompt'] = this.prompt().trim();
    if (this.videoFiles()[0]) fields['driving_video'] = this.videoFiles()[0].file;
    else fields['driving_video_url'] = this.videoUrl().trim();
    if (this.imageFiles().length) fields['character_image'] = this.imageFiles().map((f) => f.file);
    else fields['character_image_url'] = this.imageUrl().split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    await this.run(() => this.api.createVideo(fields), {
      kind: 'video',
      tool: 'Viggle Animate',
      title: this.prompt().trim() || `Animate (${this.mode()})`,
      estimatedCredits: this.cost(),
      thumbnail: this.imageFiles()[0]?.previewUrl ?? null,
    });
  }
}
