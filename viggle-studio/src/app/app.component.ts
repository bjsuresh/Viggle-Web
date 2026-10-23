import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ToastService } from './core/toast.service';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { registerIcons } from './core/icons';
import { SettingsService } from './core/settings.service';
import { JobsService } from './core/jobs.service';
import { StoryService } from './core/story.service';
import { CreditsService } from './core/credits.service';

@Component({
  selector: 'app-root',
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly settings = inject(SettingsService);
  private readonly jobs = inject(JobsService);
  private readonly stories = inject(StoryService);
  private readonly credits = inject(CreditsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  constructor() {
    registerIcons();
    void this.boot();
  }

  private async boot(): Promise<void> {
    await this.settings.load();
    await Promise.all([this.jobs.load(), this.stories.load()]);
    await this.credits.refresh();
    if (!this.settings.settings().appToken && this.credits.error()) {
      await this.router.navigate(['/tabs/settings']);
      await this.toast.show('Enter your server URL and app token to get started', 'warning', 4000);
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0a12' });
      } catch {
        /* iOS ignores background color */
      }
    }
  }
}
