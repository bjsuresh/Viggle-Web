import { Component, computed, signal } from '@angular/core';
import { IonContent, IonTextarea, IonRange, IonInput } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { IMAGE_ASPECTS, ImageAspect, ImageResolution } from '../../core/models';
import { imageCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-image-gen',
  imports: [IonContent, IonTextarea, IonRange, IonInput, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, OptionChipsComponent],
  template: `
    <vs-page-header title="Viggle Image" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-field" style="margin-top: 8px">
        <div class="vs-label">Prompt <small>{{ prompt().length }}/4000</small></div>
        <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="4" maxlength="4000"
          placeholder="A cinematic portrait of a jazz singer under a single spotlight, film grain, 85mm…"></ion-textarea>
      </div>
      <div class="vs-field">
        <div class="vs-label">Aspect ratio</div>
        <vs-option-chips [options]="arOptions" [value]="aspect()" (valueChange)="aspect.set($any($event))"></vs-option-chips>
      </div>
      <div class="vs-field">
        <div class="vs-label">Resolution</div>
        <vs-option-chips [options]="[{ value: '1K', label: '1K', hint: '1 cr' }, { value: '2K', label: '2K', hint: '2 cr' }]"
          [value]="resolution()" (valueChange)="resolution.set($any($event))"></vs-option-chips>
      </div>
      <div class="vs-field">
        <div class="vs-label">Images <small>{{ n() }}</small></div>
        <ion-range min="1" max="6" step="1" snaps="true" pin="true" [value]="n()" (ionChange)="n.set($any($event).detail.value)"></ion-range>
      </div>
      <vs-media-picker title="Reference images (optional)" hint="Up to 8. Guides subject, style or composition. 2K output is slightly smaller with references." kind="image" [max]="8"
        [(files)]="refFiles" [(url)]="refUrl"></vs-media-picker>
      <details class="vs-advanced" style="margin-top: 12px">
        <summary>Advanced</summary>
        <ion-input label="Seed (optional)" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric" placeholder="random"
          [value]="seed()" (ionInput)="seed.set($any($event).detail.value ?? '')"></ion-input>
        <p class="vs-help">Image i uses (seed + i). Generated images are deleted 24 h after completion — download what you keep.</p>
      </details>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Generate images" [disabled]="!prompt().trim()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
})
export class ImageGenPage extends ToolBase {
  readonly prompt = signal('');
  readonly aspect = signal<ImageAspect>('1:1');
  readonly resolution = signal<ImageResolution>('1K');
  readonly n = signal(1);
  readonly seed = signal('');
  readonly refFiles = signal<PickedMedia[]>([]);
  readonly refUrl = signal('');
  readonly arOptions = IMAGE_ASPECTS.map((a) => ({ value: a, label: a }));
  readonly cost = computed(() => imageCredits(this.n(), this.resolution()));

  async generate(): Promise<void> {
    const fields: FormInput = {
      prompt: this.prompt().trim(),
      aspect_ratio: this.aspect(),
      resolution: this.resolution(),
      n: this.n(),
      model: 'qwen',
    };
    if (this.seed().trim()) fields['seed'] = Number(this.seed());
    if (this.refFiles().length) fields['reference_image'] = this.refFiles().map((f) => f.file);
    if (this.refUrl().trim()) fields['reference_image_url'] = this.refUrl().split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    await this.run(() => this.api.createImage(fields), {
      kind: 'image',
      tool: 'Viggle Image',
      title: this.prompt().trim(),
      estimatedCredits: this.cost(),
    });
  }
}
