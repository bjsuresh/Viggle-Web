import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonTextarea, IonInput, IonRange, IonToggle, IonItem, IonLabel, IonNote, IonList } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { StoryService } from '../../core/story.service';
import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';
import { ASPECT_RATIOS, AspectRatio, StorySettings, VIDEO_RESOLUTIONS, VideoQuality, VideoResolution } from '../../core/models';
import { h3VideoCredits } from '../../core/pricing';

const STYLES = ['cinematic', 'anime', 'pixar-style 3D', 'documentary', 'noir', 'watercolor', 'cyberpunk', 'claymation', 'vintage film'];
const TONES = ['uplifting', 'epic', 'funny', 'mysterious', 'romantic', 'scary', 'calm', 'dramatic'];
const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Portuguese', 'Arabic'];

@Component({
  selector: 'app-story-new',
  imports: [IonContent, IonTextarea, IonInput, IonRange, IonToggle, IonItem, IonLabel, IonNote, IonList, PageHeaderComponent, OptionChipsComponent, SubmitBarComponent],
  template: `
    <vs-page-header title="New story" back="/tabs/story"></vs-page-header>
    <ion-content>
      <div class="vs-field" style="margin-top: 8px">
        <div class="vs-label">Story idea</div>
        <ion-textarea class="prompt" [value]="idea()" (ionInput)="idea.set($any($event).detail.value ?? '')" autoGrow="true" rows="4"
          placeholder="A lonely lighthouse keeper befriends a lost baby whale and guides it back to its family during a storm."></ion-textarea>
      </div>
      <ion-input label="Recurring characters (optional)" labelPlacement="stacked" fill="outline" [value]="characters()" (ionInput)="characters.set($any($event).detail.value ?? '')"
        placeholder="e.g. Old keeper with a grey beard and yellow raincoat; small blue whale with a scar"></ion-input>

      <div class="vs-field" style="margin-top: 18px">
        <div class="vs-label">Scenes <small>{{ scenes() }} · {{ scenes() * s().duration_s }} s total</small></div>
        <ion-range min="2" max="8" step="1" snaps="true" pin="true" [value]="scenes()" (ionChange)="scenes.set($any($event).detail.value)"></ion-range>
      </div>
      <div class="vs-field">
        <div class="vs-label">Visual style</div>
        <vs-option-chips [options]="styleOptions" [value]="style()" (valueChange)="style.set($any($event))"></vs-option-chips>
      </div>
      <div class="vs-field">
        <div class="vs-label">Tone</div>
        <vs-option-chips [options]="toneOptions" [value]="tone()" (valueChange)="tone.set($any($event))"></vs-option-chips>
      </div>
      <div class="vs-field">
        <div class="vs-label">Narration language</div>
        <vs-option-chips [options]="langOptions" [value]="language()" (valueChange)="language.set($any($event))"></vs-option-chips>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Clip settings</div>
        <div class="vs-field">
          <div class="vs-label">Quality</div>
          <vs-option-chips [options]="[{ value: 'high', label: 'High' }, { value: 'low', label: 'Low', hint: 'faster' }]" [value]="s().quality" (valueChange)="set('quality', $any($event))"></vs-option-chips>
        </div>
        <div class="vs-field">
          <div class="vs-label">Seconds per scene <small>{{ s().duration_s }} s</small></div>
          <ion-range min="5" max="15" step="1" snaps="true" pin="true" [value]="s().duration_s" (ionChange)="set('duration_s', $any($event).detail.value)"></ion-range>
        </div>
        <div class="vs-field">
          <div class="vs-label">Resolution</div>
          <vs-option-chips [options]="resOptions" [value]="s().resolution" (valueChange)="set('resolution', $any($event))"></vs-option-chips>
        </div>
        <div class="vs-field">
          <div class="vs-label">Aspect ratio</div>
          <vs-option-chips [options]="arOptions" [value]="s().aspect_ratio" (valueChange)="set('aspect_ratio', $any($event))"></vs-option-chips>
        </div>
        <ion-list lines="none" class="vs-stack">
          <ion-item>
            <ion-toggle [checked]="s().useKeyframes" (ionChange)="set('useKeyframes', $any($event).detail.checked)">
              <ion-label>Generate keyframes first</ion-label>
              <ion-note>+1 credit per scene; keeps look consistent (image → first frame)</ion-note>
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-toggle [checked]="s().enhance" (ionChange)="set('enhance', $any($event).detail.checked)">
              <ion-label>AI prompt enhancer</ion-label>
            </ion-toggle>
          </ion-item>
        </ion-list>
      </div>
      <p class="vs-help">Writing the script is free. Generation is billed per scene when you press Generate on the next screen.</p>
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="cost()" label="Write script" [disabled]="idea().trim().length < 3" [busy]="busy()" (action)="create()"></vs-submit-bar>
  `,
})
export class StoryNewPage {
  private readonly stories = inject(StoryService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly idea = signal('');
  readonly characters = signal('');
  readonly scenes = signal(4);
  readonly style = signal('cinematic');
  readonly tone = signal('uplifting');
  readonly language = signal('English');
  readonly busy = signal(false);
  readonly s = signal<StorySettings>({
    quality: this.settings.settings().defaultQuality as VideoQuality,
    duration_s: 5,
    resolution: this.settings.settings().defaultResolution as VideoResolution,
    aspect_ratio: this.settings.settings().defaultAspect as AspectRatio,
    useKeyframes: true,
    enhance: true,
  });
  readonly styleOptions = STYLES.map((v) => ({ value: v, label: v }));
  readonly toneOptions = TONES.map((v) => ({ value: v, label: v }));
  readonly langOptions = LANGS.map((v) => ({ value: v, label: v }));
  readonly resOptions = VIDEO_RESOLUTIONS.map((r) => ({ value: r, label: r, hint: r === '4k' ? '5 cr/s' : undefined }));
  readonly arOptions = ASPECT_RATIOS.map((a) => ({ value: a, label: a }));
  readonly cost = computed(() => this.scenes() * (h3VideoCredits(this.s().duration_s, this.s().resolution) + (this.s().useKeyframes ? 1 : 0)));

  set<K extends keyof StorySettings>(k: K, v: StorySettings[K] | undefined): void {
    if (v === undefined) return;
    this.s.update((o) => ({ ...o, [k]: v }));
  }

  async create(): Promise<void> {
    this.busy.set(true);
    try {
      const story = await this.stories.plan(
        { idea: this.idea().trim(), scenes: this.scenes(), style: this.style(), tone: this.tone(), characters: this.characters().trim() || undefined, language: this.language() },
        this.s(),
      );
      await this.router.navigate(['/story', story.id], { replaceUrl: true });
    } catch (e) {
      await this.toast.error(e, 'Could not write the script');
    } finally {
      this.busy.set(false);
    }
  }
}
