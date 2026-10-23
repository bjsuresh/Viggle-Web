import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonButton, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { JobCardComponent } from '../../shared/job-card.component';
import { JobsService } from '../../core/jobs.service';
import { CreditsService } from '../../core/credits.service';
import { StoryService } from '../../core/story.service';
import { usd } from '../../core/pricing';

interface Quick {
  title: string;
  sub: string;
  icon: string;
  link: string;
  tint: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, IonContent, IonIcon, IonButton, IonRefresher, IonRefresherContent, PageHeaderComponent, JobCardComponent],
  template: `
    <vs-page-header title="Viggle Studio"></vs-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>

      <div class="vs-hero" style="margin-top: 8px">
        <div class="vs-row">
          <div>
            <h1>Create with AI</h1>
            <p>Pro-quality videos, images, stories and 3D — no watermark, native audio.</p>
          </div>
        </div>
        <div class="balance">
          <div>
            <div class="bal-label">Credits balance</div>
            <div class="bal-value">{{ credits.balance() ?? '—' }} <span>{{ credits.balance() !== null ? usd(credits.balance()!) : '' }}</span></div>
          </div>
          <a class="bal-link" routerLink="/tabs/settings">Server & keys</a>
        </div>
        @if (credits.error()) {
          <div class="bal-error"><ion-icon name="warning"></ion-icon> {{ credits.error() }}</div>
          <ion-button size="small" class="gradient" routerLink="/tabs/settings" style="margin-top: 10px">
            <ion-icon slot="start" name="settings"></ion-icon>Set up server
          </ion-button>
        }
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Quick create <a class="link" routerLink="/tabs/create">All tools</a></div>
        <div class="quick">
          @for (q of quick; track q.link) {
            <a class="q" [routerLink]="q.link" [style.--tint]="q.tint">
              <ion-icon [name]="q.icon"></ion-icon>
              <div class="q-title">{{ q.title }}</div>
              <div class="q-sub">{{ q.sub }}</div>
            </a>
          }
        </div>
      </div>

      @if (jobs.active().length) {
        <div class="vs-section">
          <div class="vs-section-title">In progress <span class="vs-pill busy">{{ jobs.active().length }}</span></div>
          <div class="vs-stack">
            @for (j of jobs.active(); track j.id) {
              <vs-job-card [job]="j"></vs-job-card>
            }
          </div>
        </div>
      }

      <div class="vs-section">
        <div class="vs-section-title">Recent <a class="link" routerLink="/tabs/library">Library</a></div>
        @if (jobs.recent().length) {
          <div class="vs-stack">
            @for (j of jobs.recent().slice(0, 6); track j.id) {
              <vs-job-card [job]="j"></vs-job-card>
            }
          </div>
        } @else {
          <div class="vs-empty">
            <ion-icon name="rocket"></ion-icon>
            <h3>Nothing yet</h3>
            <p>Pick a tool above to generate your first video.</p>
          </div>
        }
      </div>

      @if (stories.sorted().length) {
        <div class="vs-section">
          <div class="vs-section-title">Stories <a class="link" routerLink="/tabs/story">See all</a></div>
          <div class="vs-stack">
            @for (s of stories.sorted().slice(0, 3); track s.id) {
              <a class="story" [routerLink]="['/story', s.id]">
                <ion-icon name="book"></ion-icon>
                <div class="s-body">
                  <div class="s-title">{{ s.title }}</div>
                  <div class="s-sub">{{ s.scenes.length }} scenes · {{ s.settings.aspect_ratio }}</div>
                </div>
                <ion-icon name="chevron-forward"></ion-icon>
              </a>
            }
          </div>
        </div>
      }
      <div style="height: 24px"></div>
    </ion-content>
  `,
  styles: [
    `
      .balance { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--vs-border-strong); }
      .bal-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--vs-muted); }
      .bal-value { font-size: 26px; font-weight: 900; letter-spacing: -.02em; }
      .bal-value span { font-size: 13px; color: var(--vs-muted); font-weight: 600; }
      .bal-link { font-size: 12px; font-weight: 700; color: var(--vs-secondary); text-decoration: none; }
      .bal-error { margin-top: 10px; font-size: 12px; color: var(--ion-color-warning); display: flex; align-items: center; gap: 6px; }
      .quick { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .q { display: block; padding: 16px 14px; border-radius: 18px; background: var(--vs-surface); border: 1px solid var(--vs-border); text-decoration: none; color: inherit; position: relative; overflow: hidden; }
      .q::after { content: ''; position: absolute; inset: auto -30% -40% auto; width: 120px; height: 120px; border-radius: 50%; background: var(--tint); opacity: .22; filter: blur(24px); }
      .q ion-icon { font-size: 26px; color: var(--tint); margin-bottom: 8px; }
      .q-title { font-weight: 800; font-size: 15px; }
      .q-sub { font-size: 12px; color: var(--vs-muted); margin-top: 2px; }
      .story { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: var(--vs-surface); border: 1px solid var(--vs-border); text-decoration: none; color: inherit; }
      .story > ion-icon:first-child { font-size: 24px; color: var(--ion-color-tertiary); }
      .s-body { flex: 1; min-width: 0; }
      .s-title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .s-sub { font-size: 12px; color: var(--vs-muted); }
    `,
  ],
})
export class HomePage {
  readonly jobs = inject(JobsService);
  readonly credits = inject(CreditsService);
  readonly stories = inject(StoryService);
  readonly usd = usd;

  readonly quick: Quick[] = [
    { title: 'Text to Video', sub: 'Describe a shot', icon: 'text', link: '/tool/text-to-video', tint: '#7c5cff' },
    { title: 'Image to Video', sub: 'Animate a photo', icon: 'image', link: '/tool/image-to-video', tint: '#22d3ee' },
    { title: 'Story Studio', sub: 'Idea → short film', icon: 'book', link: '/story/new', tint: '#f472b6' },
    { title: 'Video Remix', sub: 'Character + motion', icon: 'swap-horizontal', link: '/tool/remix', tint: '#fbbf24' },
  ];

  async refresh(ev: CustomEvent): Promise<void> {
    await this.credits.refresh();
    for (const j of this.jobs.recent().slice(0, 10)) {
      try {
        await this.jobs.refresh(j.id);
      } catch {
        /* ignore */
      }
    }
    (ev.target as HTMLIonRefresherElement).complete();
  }
}
