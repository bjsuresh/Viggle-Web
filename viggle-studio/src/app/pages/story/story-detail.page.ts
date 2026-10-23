import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonTextarea, IonSpinner, IonProgressBar } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StoryService } from '../../core/story.service';
import { JobsService } from '../../core/jobs.service';
import { MediaService } from '../../core/media.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Story } from '../../core/models';
import { usd } from '../../core/pricing';

@Component({
  selector: 'app-story-detail',
  imports: [RouterLink, IonContent, IonButton, IonIcon, IonTextarea, IonSpinner, IonProgressBar, PageHeaderComponent],
  template: `
    <vs-page-header [title]="story()?.title ?? 'Story'" back="/tabs/story"></vs-page-header>
    <ion-content>
      @if (story(); as s) {
        <div class="vs-hero" style="margin-top: 8px">
          <h1>{{ s.title }}</h1>
          <p>{{ s.logline }}</p>
          <div class="meta">
            <span class="vs-pill">{{ s.scenes.length }} scenes</span>
            <span class="vs-pill">{{ s.settings.duration_s }} s each</span>
            <span class="vs-pill">{{ s.settings.resolution }} · {{ s.settings.aspect_ratio }}</span>
            <span class="vs-pill">{{ s.planner === 'claude' ? 'AI script' : 'Template script' }}</span>
          </div>
          @if (running()) {
            <div style="margin-top: 14px">
              <ion-progress-bar [value]="doneCount() / s.scenes.length"></ion-progress-bar>
              <div class="vs-help" style="margin-top: 6px"><ion-spinner name="dots" style="width: 16px; height: 10px"></ion-spinner> {{ progressMsg() || 'Generating…' }}</div>
            </div>
          }
        </div>

        <div class="cta">
          @if (doneCount() < s.scenes.length) {
            <ion-button class="gradient" expand="block" [disabled]="running()" (click)="generateAll()">
              <ion-icon slot="start" name="sparkles"></ion-icon>
              {{ doneCount() ? 'Generate remaining' : 'Generate all scenes' }} · ~{{ remainingCredits() }} cr ({{ usd(remainingCredits()) }})
            </ion-button>
          } @else {
            <ion-button class="gradient" expand="block" [disabled]="s.stitching || !stitchable()" (click)="stitch()">
              <ion-icon slot="start" name="film"></ion-icon>
              {{ s.stitching ? 'Stitching film…' : s.stitchedUrl ? 'Re-stitch film' : 'Stitch into one film' }}
            </ion-button>
            @if (!stitchable()) {
              <p class="vs-help">Server stitching needs ffmpeg (ffmpeg-static) on the backend. Clips can still be downloaded individually.</p>
            }
          }
        </div>

        @if (s.stitchedUrl) {
          <div class="vs-section">
            <div class="vs-section-title">Final film</div>
            <video class="vs-video" [src]="s.stitchedUrl" controls playsinline preload="metadata"></video>
            <div class="vs-row" style="margin-top: 10px">
              <ion-button size="small" fill="outline" (click)="download(s.stitchedUrl!, s.title + '.mp4')"><ion-icon slot="start" name="download"></ion-icon>Save / share</ion-button>
              <ion-button size="small" fill="clear" (click)="media.openExternal(s.stitchedUrl!)"><ion-icon slot="start" name="expand"></ion-icon>Open</ion-button>
            </div>
          </div>
        }

        <div class="vs-section">
          <div class="vs-section-title">Style guide</div>
          <ion-textarea class="prompt" [value]="s.style_guide" (ionChange)="stories.update(s.id, { style_guide: $any($event).detail.value ?? '' })" autoGrow="true" rows="2"></ion-textarea>
        </div>

        <div class="vs-section">
          <div class="vs-section-title">Scenes</div>
          <div class="vs-stack">
            @for (sc of s.scenes; track $index; let i = $index) {
              <div class="scene vs-card">
                <div class="vs-row">
                  <div class="sc-title">{{ sc.title }}</div>
                  <span class="vs-pill" [class.ok]="sc.videoUrl" [class.busy]="sc.videoJobId && !sc.videoUrl">
                    {{ sc.videoUrl ? 'clip ready' : sc.videoJobId ? jobStatus(sc.videoJobId) : sc.keyframeUrl ? 'keyframe ready' : 'not generated' }}
                  </span>
                </div>
                <div class="sc-meta">{{ sc.camera }} · {{ sc.mood }}</div>
                @if (sc.videoUrl) {
                  <video class="vs-video" [src]="sc.videoUrl" controls playsinline preload="metadata" [poster]="sc.keyframeUrl ?? ''"></video>
                } @else if (sc.keyframeUrl) {
                  <img class="keyframe" [src]="sc.keyframeUrl" alt="" />
                }
                <div class="vs-label" style="margin-top: 10px">Video prompt</div>
                <ion-textarea class="prompt small" [value]="sc.video_prompt" autoGrow="true" rows="2" [disabled]="!!sc.videoJobId"
                  (ionChange)="stories.updateScene(s.id, i, { video_prompt: $any($event).detail.value ?? '' })"></ion-textarea>
                @if (s.settings.useKeyframes && !sc.keyframeUrl) {
                  <div class="vs-label" style="margin-top: 10px">Keyframe prompt</div>
                  <ion-textarea class="prompt small" [value]="sc.image_prompt" autoGrow="true" rows="2"
                    (ionChange)="stories.updateScene(s.id, i, { image_prompt: $any($event).detail.value ?? '' })"></ion-textarea>
                }
                <div class="narration">“{{ sc.narration }}”</div>
                <div class="actions">
                  @if (!sc.videoUrl) {
                    <ion-button size="small" fill="outline" [disabled]="running()" (click)="generateOne(i)">
                      <ion-icon slot="start" name="play"></ion-icon>Generate scene
                    </ion-button>
                  } @else {
                    <ion-button size="small" fill="outline" (click)="download(sc.videoUrl!, s.title + '-scene-' + (i + 1) + '.mp4')"><ion-icon slot="start" name="download"></ion-icon>Save</ion-button>
                    <ion-button size="small" fill="clear" [disabled]="running()" (click)="regenerate(i)"><ion-icon slot="start" name="refresh"></ion-icon>Redo</ion-button>
                  }
                  @if (sc.videoJobId) {
                    <ion-button size="small" fill="clear" [routerLink]="['/job', sc.videoJobId]">Job</ion-button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="vs-section">
          <ion-button expand="block" fill="clear" color="danger" (click)="remove()"><ion-icon slot="start" name="trash"></ion-icon>Delete story</ion-button>
        </div>
      } @else {
        <div class="vs-empty"><h3>Story not found</h3></div>
      }
      <div style="height: 24px"></div>
    </ion-content>
  `,
  styles: [
    `
      .meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
      .cta { margin: 14px 0 4px; }
      .cta ion-button { height: 50px; }
      .sc-title { font-weight: 800; font-size: 15px; }
      .sc-meta { font-size: 12px; color: var(--vs-muted); margin: 2px 0 10px; }
      .keyframe { width: 100%; border-radius: 14px; display: block; }
      .narration { margin-top: 10px; font-style: italic; color: var(--vs-muted); font-size: 13px; }
      .actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      ion-textarea.small { min-height: 0; font-size: 13px; }
    `,
  ],
})
export class StoryDetailPage {
  readonly stories = inject(StoryService);
  readonly media = inject(MediaService);
  private readonly jobs = inject(JobsService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly story = computed<Story | undefined>(() => this.stories.stories().find((s) => s.id === this.id()));
  readonly running = computed(() => !!this.stories.running()[this.id()]);
  readonly doneCount = computed(() => this.story()?.scenes.filter((s) => !!s.videoUrl).length ?? 0);
  readonly remainingCredits = computed(() => {
    const s = this.story();
    if (!s) return 0;
    const perScene = this.stories.estimateCredits(s) / s.scenes.length;
    return Math.round(perScene * (s.scenes.length - this.doneCount()));
  });
  readonly progressMsg = signal('');
  readonly stitchable = signal(true);
  readonly usd = usd;

  constructor() {
    void this.api.stitchCapabilities().then((c) => this.stitchable.set(c.available)).catch(() => this.stitchable.set(false));
  }

  jobStatus(id: string): string {
    const j = this.jobs.get(id);
    if (!j) return 'queued';
    return j.status === 'processing' && j.progress != null ? `${j.progress}%` : j.status;
  }

  async generateAll(): Promise<void> {
    try {
      await this.stories.generateAll(this.id(), (m) => this.progressMsg.set(m));
      await this.toast.success('All scenes generated');
    } catch (e) {
      await this.toast.error(e, 'Generation stopped');
    } finally {
      this.progressMsg.set('');
    }
  }

  async generateOne(i: number): Promise<void> {
    this.stories.running.update((r) => ({ ...r, [this.id()]: true }));
    try {
      await this.stories.generateScene(this.id(), i);
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.stories.running.update((r) => ({ ...r, [this.id()]: false }));
    }
  }

  async regenerate(i: number): Promise<void> {
    this.stories.updateScene(this.id(), i, { videoJobId: undefined, videoUrl: null });
    await this.generateOne(i);
  }

  async stitch(): Promise<void> {
    try {
      await this.stories.stitch(this.id());
      await this.toast.success('Film ready');
    } catch (e) {
      await this.toast.error(e, 'Stitching failed');
    }
  }

  async download(url: string, name: string): Promise<void> {
    try {
      await this.media.saveAndShare(url, name.replace(/[^\w.-]+/g, '_'));
    } catch (e) {
      await this.toast.error(e, 'Download failed');
    }
  }

  async remove(): Promise<void> {
    if (!(await this.toast.confirm('Delete story?', 'Removes the story and its script from this device. Generated clips stay in your Library.'))) return;
    this.stories.remove(this.id());
    await this.router.navigate(['/tabs/story'], { replaceUrl: true });
  }
}
