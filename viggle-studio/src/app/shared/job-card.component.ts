import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { Job } from '../core/models';

@Component({
  selector: 'vs-job-card',
  imports: [RouterLink, IonIcon, DatePipe],
  template: `
    <a class="card" [routerLink]="['/job', job().id]">
      <div class="thumb" [class.placeholder]="!job().thumbnail">
        @if (job().thumbnail) {
          <img [src]="job().thumbnail" alt="" loading="lazy" />
        } @else {
          <ion-icon [name]="icon()"></ion-icon>
        }
        @if (job().status === 'processing' || job().status === 'queued') {
          <div class="bar"><div class="fill" [style.width.%]="job().progress ?? 8" [class.indeterminate]="job().progress === null"></div></div>
        }
      </div>
      <div class="body">
        <div class="row">
          <span class="tool">{{ job().tool }}</span>
          <span class="status" [attr.data-status]="job().status">{{ label() }}</span>
        </div>
        <div class="title">{{ job().title }}</div>
        <div class="meta">
          {{ job().createdAt | date: 'MMM d, HH:mm' }}
          @if (job().estimatedCredits) {
            · ~{{ job().estimatedCredits }} cr
          }
          @if (job().stage) {
            · {{ job().stage }}
          }
        </div>
      </div>
      <ion-icon name="chevron-forward" class="chev"></ion-icon>
    </a>
  `,
  styles: [
    `
      .card { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 16px; background: var(--vs-surface); border: 1px solid var(--vs-border); text-decoration: none; color: inherit; }
      .thumb { position: relative; width: 64px; height: 64px; border-radius: 12px; overflow: hidden; background: var(--vs-surface-2); display: grid; place-items: center; flex: 0 0 auto; }
      .thumb img { width: 100%; height: 100%; object-fit: cover; }
      .thumb ion-icon { font-size: 26px; color: var(--vs-secondary); }
      .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255,255,255,.12); }
      .fill { height: 100%; background: var(--vs-accent-gradient); transition: width .4s; }
      .fill.indeterminate { animation: slide 1.4s infinite ease-in-out; width: 35% !important; }
      @keyframes slide { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }
      .body { flex: 1; min-width: 0; }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .tool { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--vs-secondary); }
      .title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
      .meta { font-size: 12px; color: var(--vs-muted); margin-top: 2px; }
      .status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--vs-surface-2); color: var(--vs-muted); }
      .status[data-status='ready'] { background: rgba(46, 204, 113, .18); color: #4ade80; }
      .status[data-status='failed'], .status[data-status='cancelled'] { background: rgba(239, 68, 68, .18); color: #f87171; }
      .status[data-status='processing'], .status[data-status='queued'] { background: rgba(124, 92, 255, .2); color: #c4b5fd; }
      .chev { color: var(--vs-muted); }
    `,
  ],
})
export class JobCardComponent {
  readonly job = input.required<Job>();
  readonly label = computed(() => {
    const j = this.job();
    if (j.status === 'processing' && j.progress != null) return `${j.progress}%`;
    return j.status;
  });
  readonly icon = computed(() => {
    switch (this.job().kind) {
      case 'image':
        return 'image';
      case 'character':
        return 'person';
      case 'motion':
        return 'body';
      case 'scene':
        return 'cube';
      case 'render':
        return 'swap-horizontal';
      default:
        return 'videocam';
    }
  });
}
