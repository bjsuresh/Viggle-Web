import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { describeError } from './toast.service';

@Injectable({ providedIn: 'root' })
export class CreditsService {
  private readonly api = inject(ApiService);
  readonly balance = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  async refresh(): Promise<void> {
    try {
      const c = await this.api.credits();
      this.balance.set(Math.round(c.balance * 100) / 100);
      this.error.set(null);
    } catch (e) {
      this.error.set(describeError(e, 'Cannot load credits'));
    }
  }
}
