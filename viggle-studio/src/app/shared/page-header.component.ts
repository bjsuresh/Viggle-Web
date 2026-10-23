import { Component, inject, input } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon } from '@ionic/angular';
import { CreditsService } from '../core/credits.service';

@Component({
  selector: 'vs-page-header',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        @if (back()) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="back()" text=""></ion-back-button>
          </ion-buttons>
        }
        <ion-title>{{ title() }}</ion-title>
        <ion-buttons slot="end">
          <span class="credits" (click)="credits.refresh()">
            <ion-icon name="wallet"></ion-icon>
            {{ credits.balance() ?? '—' }}
          </span>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [
    `
      .credits { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; margin-right: 8px; border-radius: 999px; background: var(--vs-surface-2); font-size: 12px; font-weight: 700; color: var(--vs-text); cursor: pointer; }
      .credits ion-icon { color: var(--vs-secondary); }
    `,
  ],
})
export class PageHeaderComponent {
  readonly credits = inject(CreditsService);
  readonly title = input.required<string>();
  readonly back = input<string>('');
}
