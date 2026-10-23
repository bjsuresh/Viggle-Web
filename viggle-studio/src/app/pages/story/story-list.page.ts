import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonButton, IonFab, IonFabButton } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StoryService } from '../../core/story.service';
import { Story } from '../../core/models';

@Component({
  selector: 'app-story-list',
  imports: [RouterLink, DatePipe, IonContent, IonIcon, IonButton, IonFab, IonFabButton, PageHeaderComponent],
  template: `
    <vs-page-header title="Stories"></vs-page-header>
    <ion-content>
      @if (stories.sorted().length) {
        <div class="vs-stack" style="margin-top: 8px">
          @for (s of stories.sorted(); track s.id) {
            <a class="story" [routerLink]="['/story', s.id]">
              <div class="cover">
                @if (cover(s); as c) {
                  <img [src]="c" alt="" />
                } @else {
                  <ion-icon name="book"></ion-icon>
                }
              </div>
              <div class="body">
                <div class="title">{{ s.title }}</div>
                <div class="sub">{{ s.logline }}</div>
                <div class="meta">
                  <span class="vs-pill" [class.ok]="done(s) === s.scenes.length" [class.busy]="stories.running()[s.id]">
                    {{ done(s) }}/{{ s.scenes.length }} clips
                  </span>
                  @if (s.stitchedUrl) {
                    <span class="vs-pill ok"><ion-icon name="film"></ion-icon> film ready</span>
                  }
                  <span class="date">{{ s.createdAt | date: 'MMM d' }}</span>
                </div>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="vs-empty" style="margin-top: 60px">
          <ion-icon name="book"></ion-icon>
          <h3>No stories yet</h3>
          <p>Describe an idea and Story Studio writes the scenes, generates keyframes and clips, then stitches one film.</p>
          <ion-button class="gradient" routerLink="/story/new" style="margin-top: 16px"><ion-icon slot="start" name="sparkles"></ion-icon>New story</ion-button>
        </div>
      }
      <div style="height: 90px"></div>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button routerLink="/story/new"><ion-icon name="add"></ion-icon></ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      .story { display: flex; gap: 12px; padding: 10px; border-radius: 18px; background: var(--vs-surface); border: 1px solid var(--vs-border); text-decoration: none; color: inherit; }
      .cover { width: 86px; height: 86px; border-radius: 14px; overflow: hidden; background: var(--vs-surface-2); display: grid; place-items: center; flex: 0 0 auto; }
      .cover img { width: 100%; height: 100%; object-fit: cover; }
      .cover ion-icon { font-size: 30px; color: var(--ion-color-tertiary); }
      .body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
      .title { font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 12px; color: var(--vs-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 2px 0 6px; }
      .meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .date { font-size: 11px; color: var(--vs-muted); margin-left: auto; }
    `,
  ],
})
export class StoryListPage {
  readonly stories = inject(StoryService);

  done(s: Story): number {
    return s.scenes.filter((sc) => !!sc.videoUrl).length;
  }
  cover(s: Story): string | null {
    return s.scenes.find((sc) => sc.keyframeUrl)?.keyframeUrl ?? null;
  }
}
