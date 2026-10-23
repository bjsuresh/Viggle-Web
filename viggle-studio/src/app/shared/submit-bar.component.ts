import { Component, inject, input, output } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { ApiService } from '../core/api.service';
import { usd } from '../core/pricing';

/** Sticky bottom bar with a cost estimate and the generate button. */
@Component({
  selector: 'vs-submit-bar',
  imports: [IonButton, IonIcon, IonSpinner],
  template: `
    <div class="bar">
      <div class="cost">
        <div class="cost-label">Estimated cost</div>
        <div class="cost-value">{{ credits() }} credits <span>· {{ usd(credits()) }}</span></div>
      </div>
      <ion-button class="go" [disabled]="disabled() || busy()" (click)="action.emit()">
        @if (busy()) {
          <ion-spinner name="crescent" slot="start"></ion-spinner>
          {{ api.uploadProgress() !== null ? 'Uploading ' + api.uploadProgress() + '%' : 'Submitting…' }}
        } @else {
          <ion-icon slot="start" name="sparkles"></ion-icon>
          {{ label() }}
        }
      </ion-button>
    </div>
  `,
  styles: [
    `
      :host { position: sticky; bottom: 0; z-index: 5; display: block; }
      .bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--vs-bg) 85%, transparent); backdrop-filter: blur(16px); border-top: 1px solid var(--vs-border); }
      .cost-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--vs-muted); }
      .cost-value { font-weight: 700; font-size: 15px; }
      .cost-value span { color: var(--vs-muted); font-weight: 500; }
      .go { --border-radius: 14px; --padding-start: 20px; --padding-end: 20px; height: 48px; font-weight: 700; }
    `,
  ],
})
export class SubmitBarComponent {
  readonly api = inject(ApiService);
  readonly credits = input.required<number>();
  readonly label = input<string>('Generate');
  readonly disabled = input<boolean>(false);
  readonly busy = input<boolean>(false);
  readonly action = output<void>();
  readonly usd = usd;
}
