import { Component, computed, signal } from '@angular/core';
import { IonContent, IonTextarea, IonIcon } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { H3Options, H3OptionsComponent, defaultH3, h3Fields } from '../../shared/h3-options.component';
import { ToolBase } from './tool-base';
import { h3VideoCredits } from '../../core/pricing';

const IDEAS = [
  'a paper airplane gliding through a sunlit office, soft dust in the air, gentle piano',
  'neon-lit Tokyo alley in the rain, a cat watching from under an umbrella, synth ambience',
  'drone shot over a misty pine forest at sunrise, birds taking flight',
  'macro shot of coffee being poured into a glass cup, slow motion, warm light',
  'a vintage train crossing a stone viaduct, steam rising, orchestral swell',
];

@Component({
  selector: 'app-text-to-video',
  imports: [IonContent, IonTextarea, IonIcon, PageHeaderComponent, SubmitBarComponent, H3OptionsComponent],
  template: `
    <vs-page-header title="Text to Video" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-field" style="margin-top: 8px">
        <div class="vs-label">Prompt <small>{{ prompt().length }} chars</small></div>
        <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="4"
          placeholder="Describe the subject, action, setting, lighting, camera move and sound…"></ion-textarea>
        <div class="ideas">
          @for (i of ideas; track i) {
            <button type="button" class="idea" (click)="prompt.set(i)"><ion-icon name="color-wand"></ion-icon>{{ i.slice(0, 42) }}…</button>
          }
        </div>
      </div>
      <vs-h3-options [(value)]="opts"></vs-h3-options>
      <p class="vs-help">Every H3 video includes native audio. Output links are valid for one hour and refreshed whenever you open the job.</p>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Generate video" [disabled]="!prompt().trim()" [busy]="busy()" (action)="generate()"></vs-submit-bar>
  `,
  styles: [
    `
      .ideas { display: flex; gap: 8px; overflow-x: auto; margin-top: 10px; scrollbar-width: none; }
      .ideas::-webkit-scrollbar { display: none; }
      .idea { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; color: var(--vs-text); background: var(--vs-surface-2); border: 1px solid var(--vs-border); border-radius: 999px; padding: 7px 12px; cursor: pointer; }
      .idea ion-icon { color: var(--vs-secondary); }
    `,
  ],
})
export class TextToVideoPage extends ToolBase {
  readonly prompt = signal('');
  readonly ideas = IDEAS;
  readonly opts = signal<H3Options>(defaultH3(this.settings));
  readonly cost = computed(() => h3VideoCredits(this.opts().duration_s, this.opts().resolution));

  async generate(): Promise<void> {
    const fields = { prompt: this.prompt().trim(), ...h3Fields(this.opts(), this.settings.settings().watermark) };
    await this.run(() => this.api.createVideo(fields), {
      kind: 'video',
      tool: 'Text to Video',
      title: this.prompt().trim(),
      params: fields,
      estimatedCredits: this.cost(),
    });
  }
}
