import { Injectable, inject } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { ApiError } from './api.service';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);
  private readonly loading = inject(LoadingController);

  async show(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium', duration = 2600): Promise<void> {
    const t = await this.toast.create({ message, duration, color, position: 'top', swipeGesture: 'vertical' });
    await t.present();
  }

  success(message: string): Promise<void> {
    return this.show(message, 'success');
  }

  async error(err: unknown, fallback = 'Something went wrong'): Promise<void> {
    const msg = describeError(err, fallback);
    const t = await this.toast.create({
      message: msg,
      duration: 5000,
      color: 'danger',
      position: 'top',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await t.present();
  }

  async confirm(header: string, message: string, okText = 'Delete'): Promise<boolean> {
    const a = await this.alert.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: okText, role: 'destructive' },
      ],
    });
    await a.present();
    const { role } = await a.onDidDismiss();
    return role === 'destructive';
  }

  async busy(message = 'Working…'): Promise<() => Promise<void>> {
    const l = await this.loading.create({ message, spinner: 'crescent' });
    await l.present();
    return () => l.dismiss().then(() => undefined);
  }
}

export function describeError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) {
    const hint = hintFor(err.code);
    return hint ? `${err.message} — ${hint}` : `${err.code}: ${err.message}`;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function hintFor(code: string): string | null {
  const map: Record<string, string> = {
    INSUFFICIENT_CREDITS: 'Top up credits in the Viggle dashboard.',
    RATE_LIMITED: 'Please wait a moment and retry.',
    APP_UNAUTHENTICATED: 'Set the App Token in Settings.',
    UNAUTHENTICATED: 'The server has no valid Viggle API key.',
    INVALID_CREDENTIAL: 'The server Viggle API key is invalid or revoked.',
    NO_HUMANS_DETECTED: 'Use media with a clearly visible person.',
    VIDEO_TOO_LONG: 'Trim the video and try again.',
    VIDEO_TOO_LARGE: 'Max 100 MiB per video.',
    RESULT_EXPIRED: 'Reopen the job to get a fresh download link.',
    NETWORK: '',
  };
  return map[code] ?? null;
}
