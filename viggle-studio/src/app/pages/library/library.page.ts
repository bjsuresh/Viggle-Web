import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonButton, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { JobCardComponent } from '../../shared/job-card.component';
import { JobsService } from '../../core/jobs.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Job } from '../../core/models';

type Tab = 'videos' | 'images' | 'assets' | 'all';

@Component({
  selector: 'app-library',
  imports: [IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, IonButton, IonRefresher, IonRefresherContent, PageHeaderComponent, JobCardComponent],
  template: `
    <vs-page-header title="Library"></vs-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
      <ion-segment [value]="tab()" (ionChange)="tab.set($any($event).detail.value)" style="margin: 8px 0 14px">
        <ion-segment-button value="all"><ion-label>All</ion-label></ion-segment-button>
        <ion-segment-button value="videos"><ion-label>Videos</ion-label></ion-segment-button>
        <ion-segment-button value="images"><ion-label>Images</ion-label></ion-segment-button>
        <ion-segment-button value="assets"><ion-label>Assets</ion-label></ion-segment-button>
      </ion-segment>

      <div class="vs-row" style="margin-bottom: 12px">
        <span class="vs-help">{{ list().length }} items on this device</span>
        <div>
          <ion-button size="small" fill="clear" (click)="syncCloud()" [disabled]="syncing()">
            <ion-icon slot="start" name="refresh"></ion-icon>{{ syncing() ? 'Syncing…' : 'Sync cloud' }}
          </ion-button>
          <ion-button size="small" fill="clear" color="medium" (click)="clear()">Clear done</ion-button>
        </div>
      </div>

      @if (list().length) {
        <div class="vs-stack">
          @for (j of list(); track j.id) {
            <vs-job-card [job]="j"></vs-job-card>
          }
        </div>
      } @else {
        <div class="vs-empty">
          <ion-icon name="folder-open"></ion-icon>
          <h3>Library is empty</h3>
          <p>Generated videos, images and assets appear here. Tap “Sync cloud” to pull videos created with the same API key elsewhere.</p>
        </div>
      }
      <div style="height: 24px"></div>
    </ion-content>
  `,
})
export class LibraryPage {
  readonly jobs = inject(JobsService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly tab = signal<Tab>('all');
  readonly syncing = signal(false);

  readonly list = computed<Job[]>(() => {
    const all = this.jobs.recent();
    switch (this.tab()) {
      case 'videos':
        return all.filter((j) => j.kind === 'video' || j.kind === 'render');
      case 'images':
        return all.filter((j) => j.kind === 'image');
      case 'assets':
        return all.filter((j) => j.kind === 'character' || j.kind === 'motion' || j.kind === 'scene');
      default:
        return all;
    }
  });

  async refresh(ev: CustomEvent): Promise<void> {
    for (const j of this.jobs.recent().slice(0, 20)) {
      try {
        await this.jobs.refresh(j.id);
      } catch {
        /* ignore */
      }
    }
    (ev.target as HTMLIonRefresherElement).complete();
  }

  /** Pull the account video list from Viggle and track any ids we do not know yet. */
  async syncCloud(): Promise<void> {
    this.syncing.set(true);
    try {
      let cursor: string | null = null;
      let added = 0;
      for (let page = 0; page < 5; page++) {
        const res = await this.api.listVideos({ cursor, limit: 50 });
        for (const v of res.items) {
          if (this.jobs.get(v.id)) continue;
          this.jobs.track({
            id: v.id,
            kind: v.id.startsWith('render_') ? 'render' : 'video',
            tool: v.id.startsWith('anim_') ? 'Viggle Animate' : v.id.startsWith('vsr_') ? 'Upscale' : v.id.startsWith('render_') ? 'Video Remix' : 'H3 Video',
            title: v.id,
            status: v.status,
            progress: v.progress,
            createdAt: v.created_at ?? new Date().toISOString(),
            completedAt: v.completed_at,
          });
          added++;
        }
        if (!res.has_more || !res.next_cursor) break;
        cursor = res.next_cursor;
      }
      await this.toast.success(added ? `Added ${added} video${added === 1 ? '' : 's'} from the cloud` : 'Library is up to date');
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.syncing.set(false);
    }
  }

  async clear(): Promise<void> {
    if (await this.toast.confirm('Clear finished jobs?', 'Finished and failed jobs are removed from this device. Nothing is deleted from Viggle.', 'Clear')) {
      this.jobs.clearFinished();
    }
  }
}
