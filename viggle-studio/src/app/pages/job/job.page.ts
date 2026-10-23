import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, JsonPipe } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonSpinner, IonProgressBar } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { JobsService, isTerminal } from '../../core/jobs.service';
import { MediaService } from '../../core/media.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { SettingsService } from '../../core/settings.service';
import { Asset, ImageJob, Job, SceneTask, Video } from '../../core/models';

@Component({
  selector: 'app-job',
  imports: [RouterLink, DatePipe, JsonPipe, IonContent, IonButton, IonIcon, IonSpinner, IonProgressBar, PageHeaderComponent],
  template: `
    <vs-page-header [title]="job()?.tool ?? 'Job'" back="/tabs/library"></vs-page-header>
    <ion-content>
      @if (job(); as j) {
        <div class="status-card vs-card" style="margin-top: 8px">
          <div class="vs-row">
            <div style="min-width:0">
              <div class="title">{{ j.title }}</div>
              <div class="sub">{{ j.id }} · {{ j.createdAt | date: 'MMM d, HH:mm' }}</div>
            </div>
            <span class="vs-pill" [class.ok]="j.status === 'ready'" [class.bad]="j.status === 'failed' || j.status === 'cancelled'" [class.busy]="!terminal()">{{ j.status }}</span>
          </div>
          @if (!terminal()) {
            <div style="margin-top: 12px">
              <ion-progress-bar [value]="j.progress !== null ? j.progress / 100 : undefined" [type]="j.progress !== null ? 'determinate' : 'indeterminate'"></ion-progress-bar>
              <div class="vs-help" style="display:flex;gap:8px;align-items:center;margin-top:8px">
                <ion-spinner name="crescent" style="width:16px;height:16px"></ion-spinner>
                {{ j.stage ? j.stage + ' · ' : '' }}{{ j.progress !== null ? j.progress + '%' : 'Working' }}
                @if ((video()?.queue_position ?? null) !== null) { · {{ video()!.queue_position }} ahead in queue }
                @if (video()?.estimated_wait_seconds) { · ~{{ video()!.estimated_wait_seconds }} s left }
              </div>
            </div>
          }
          @if (j.error) {
            <div class="error">
              <ion-icon name="alert-circle"></ion-icon>
              <div><b>{{ j.error.code }}</b> — {{ j.error.message }}
                @if (j.error.remediation?.action) { <div class="vs-help">{{ j.error.remediation!.action }}</div> }
              </div>
            </div>
          }
        </div>

        <!-- Video results -->
        @if (video(); as v) {
          @if (v.video_url) {
            <div class="vs-section">
              <video class="vs-video" [src]="v.video_url" controls playsinline autoplay muted loop preload="metadata" [poster]="j.thumbnail ?? ''"></video>
              <div class="actions">
                <ion-button class="gradient" (click)="download(v.video_url!, j.id + '.mp4')"><ion-icon slot="start" name="download"></ion-icon>Save / share</ion-button>
                <ion-button fill="outline" [routerLink]="['/tool/upscale']" [queryParams]="{ url: v.video_url, from: j.id }"><ion-icon slot="start" name="expand"></ion-icon>Upscale 2×</ion-button>
                @if (v.alpha_url) {
                  <ion-button fill="outline" (click)="download(v.alpha_url!, j.id + '-alpha.mp4')"><ion-icon slot="start" name="layers"></ion-icon>Alpha matte</ion-button>
                }
                <ion-button fill="clear" (click)="media.openExternal(v.video_url!)"><ion-icon slot="start" name="link"></ion-icon>Open</ion-button>
              </div>
              <p class="vs-help">Links are signed for 1 hour and refreshed every time you open this page.{{ v.seed !== undefined ? ' Seed: ' + v.seed : '' }}</p>
            </div>
          }
        }

        <!-- Image results -->
        @if (imageJob(); as im) {
          @if (im.images.length) {
            <div class="vs-section">
              <div class="vs-section-title">{{ im.images.length }} image{{ im.images.length === 1 ? '' : 's' }}</div>
              <div class="img-grid">
                @for (img of im.images; track $index; let i = $index) {
                  <div class="img">
                    @if (img.url) {
                      <img [src]="img.url" alt="" loading="lazy" />
                      <div class="img-actions">
                        <button type="button" (click)="download(img.url!, j.id + '-' + (i + 1) + '.png')" aria-label="Save"><ion-icon name="download"></ion-icon></button>
                        <button type="button" [routerLink]="['/tool/image-to-video']" [queryParams]="{ first: img.url }" aria-label="Animate"><ion-icon name="videocam"></ion-icon></button>
                      </div>
                      <span class="img-meta">{{ img.width }}×{{ img.height }}</span>
                    } @else {
                      <div class="expired">Expired (24 h)</div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- Asset results -->
        @if (asset(); as a) {
          <div class="vs-section">
            <div class="vs-section-title">Asset</div>
            <div class="vs-card">
              <div class="vs-help">Name: {{ a.name || '—' }} · Type: {{ a.type }} · Capabilities: {{ a.capabilities.join(', ') || '—' }}</div>
              @if (a.vsplat) { <div class="vs-help">3D vsplat: {{ a.vsplat.status }}</div> }
              @if (a.glb) { <div class="vs-help">3D glb: {{ a.glb.status }} {{ a.glb.skeletons?.join(', ') }}</div> }
              <div class="actions">
                <ion-button fill="outline" size="small" [routerLink]="j.kind === 'character' ? '/tool/characters' : '/tool/motions'">Manage & export</ion-button>
                @if (j.kind === 'character' && a.status === 'ready') {
                  <ion-button fill="outline" size="small" routerLink="/tool/remix">Use in Remix</ion-button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Scene results -->
        @if (scene(); as sc) {
          <div class="vs-section">
            <div class="vs-section-title">Scene task · {{ sc.operation }} · {{ sc.credits }} cr</div>
            <div class="vs-card vs-stack">
              <div class="vs-help">Session {{ sc.sessionId }}{{ sc.queuePosition !== undefined ? ' · queue position ' + sc.queuePosition : '' }}</div>
              @if (sc.result; as r) {
                @if (r.preview?.url) { <img class="preview" [src]="r.preview!.url" alt="" /> }
                @if (r.panorama?.url) { <img class="preview" [src]="r.panorama!.url" alt="" /> }
                @if (r.outputBatch; as b) {
                  <div class="vs-help">Batch ID (use for Generate views / Reconstruct): <code>{{ b.batchId }}</code>
                    <ion-button size="small" fill="clear" (click)="copy(b.batchId)"><ion-icon slot="icon-only" name="copy"></ion-icon></ion-button>
                  </div>
                  @if (b.views?.length) {
                    <div class="img-grid">
                      @for (v of b.views; track v.index) {
                        <div class="img"><img [src]="v.url" alt="" loading="lazy" /><span class="img-meta">view {{ v.index }}</span></div>
                      }
                    </div>
                  }
                }
                <div class="actions">
                  @if (r.spz?.url) { <ion-button fill="outline" size="small" (click)="download(r.spz!.url, j.id + '.spz')"><ion-icon slot="start" name="cube"></ion-icon>.spz scene</ion-button> }
                  @if (r.panorama?.url) { <ion-button fill="outline" size="small" (click)="download(r.panorama!.url, j.id + '-pano.jpg')"><ion-icon slot="start" name="planet"></ion-icon>Panorama</ion-button> }
                </div>
              }
            </div>
          </div>
        }

        @if (j.params) {
          <details class="vs-advanced">
            <summary>Request parameters</summary>
            <pre class="params">{{ j.params | json }}</pre>
          </details>
        }

        <div class="vs-section">
          <div class="actions">
            <ion-button fill="outline" size="small" (click)="refresh()"><ion-icon slot="start" name="refresh"></ion-icon>Refresh</ion-button>
            <ion-button fill="outline" size="small" (click)="copy(j.id)"><ion-icon slot="start" name="copy"></ion-icon>Copy ID</ion-button>
            <ion-button fill="clear" size="small" color="danger" (click)="remove()"><ion-icon slot="start" name="trash"></ion-icon>Remove from device</ion-button>
          </div>
        </div>
      } @else {
        <div class="vs-empty"><h3>Job not found on this device</h3><p>Use “Sync cloud” in the Library to import videos created elsewhere.</p></div>
      }
      <div style="height: 24px"></div>
    </ion-content>
  `,
  styles: [
    `
      .title { font-weight: 800; font-size: 15px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
      .sub { font-size: 11px; color: var(--vs-muted); margin-top: 2px; word-break: break-all; }
      .error { display: flex; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(248, 113, 113, .12); color: #fca5a5; font-size: 13px; }
      .error ion-icon { font-size: 20px; flex: 0 0 auto; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
      .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      .img { position: relative; border-radius: 14px; overflow: hidden; background: var(--vs-surface-2); }
      .img img { width: 100%; display: block; }
      .img-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
      .img-actions button { width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(0,0,0,.6); color: #fff; display: grid; place-items: center; cursor: pointer; }
      .img-meta { position: absolute; left: 8px; bottom: 8px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,.6); color: #fff; padding: 2px 7px; border-radius: 999px; }
      .expired { padding: 30px 10px; text-align: center; font-size: 12px; color: var(--vs-muted); }
      .preview { width: 100%; border-radius: 12px; display: block; }
      .params { font-size: 11px; background: var(--vs-surface); border-radius: 12px; padding: 10px; overflow: auto; color: var(--vs-muted); }
      code { font-size: 11px; color: var(--vs-secondary); }
    `,
  ],
})
export class JobPage {
  readonly media = inject(MediaService);
  private readonly jobs = inject(JobsService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly settings = inject(SettingsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();
  readonly job = computed<Job | undefined>(() => this.jobs.jobs().find((j) => j.id === this.id()));
  readonly terminal = computed(() => {
    const j = this.job();
    return !j || isTerminal(j.status);
  });
  readonly video = computed<Video | null>(() => {
    const j = this.job();
    return j && (j.kind === 'video' || j.kind === 'render') ? ((j.result as Video) ?? null) : null;
  });
  readonly imageJob = computed<ImageJob | null>(() => {
    const j = this.job();
    return j?.kind === 'image' ? ((j.result as ImageJob) ?? null) : null;
  });
  readonly asset = computed<Asset | null>(() => {
    const j = this.job();
    return j && (j.kind === 'character' || j.kind === 'motion') ? ((j.result as Asset) ?? null) : null;
  });
  readonly scene = computed<SceneTask | null>(() => {
    const j = this.job();
    return j?.kind === 'scene' ? ((j.result as SceneTask) ?? null) : null;
  });

  private es: EventSource | null = null;
  private readonly refreshed = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      if (this.refreshed() === id) return;
      this.refreshed.set(id);
      void this.refresh();
      this.connectEvents(id);
    });
    this.destroyRef.onDestroy(() => this.es?.close());
  }

  /** Render jobs stream progress over SSE; everything else relies on polling. */
  private connectEvents(id: string): void {
    this.es?.close();
    this.es = null;
    if (!id.startsWith('render_') || this.terminal() || typeof EventSource === 'undefined') return;
    try {
      const es = new EventSource(this.api.renderEventsUrl(id));
      const onData = (ev: MessageEvent) => {
        try {
          const d = JSON.parse(ev.data);
          this.jobs.patch(id, { status: d.status, progress: d.progress ?? null, stage: d.stage ?? null });
          if (['ready', 'failed', 'cancelled'].includes(d.status)) {
            es.close();
            void this.refresh();
          }
        } catch {
          /* heartbeat or malformed */
        }
      };
      for (const name of ['snapshot', 'queued', 'processing', 'progress', 'ready', 'failed', 'cancelled']) es.addEventListener(name, onData as EventListener);
      es.onerror = () => es.close();
      this.es = es;
    } catch {
      /* fall back to polling */
    }
  }

  async refresh(): Promise<void> {
    try {
      await this.jobs.refresh(this.id());
    } catch (e) {
      await this.toast.error(e, 'Could not refresh');
    }
  }

  async download(url: string, name: string): Promise<void> {
    try {
      await this.media.saveAndShare(url, name);
    } catch (e) {
      await this.toast.error(e, 'Download failed');
    }
  }

  async copy(text: string): Promise<void> {
    await navigator.clipboard?.writeText(text);
    await this.toast.success('Copied');
  }

  async remove(): Promise<void> {
    if (!(await this.toast.confirm('Remove from device?', 'The job stays in your Viggle account; only the local entry is removed.', 'Remove'))) return;
    this.jobs.remove(this.id());
    await this.router.navigate(['/tabs/library'], { replaceUrl: true });
  }
}
