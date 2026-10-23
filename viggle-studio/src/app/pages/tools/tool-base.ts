import { inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { JobsService } from '../../core/jobs.service';
import { SettingsService } from '../../core/settings.service';
import { ToastService } from '../../core/toast.service';
import { CreditsService } from '../../core/credits.service';
import { Job, JobKind } from '../../core/models';

/** Shared plumbing for every "create" page: submit state, job tracking and navigation. */
export abstract class ToolBase {
  protected readonly api = inject(ApiService);
  protected readonly jobs = inject(JobsService);
  protected readonly settings = inject(SettingsService);
  protected readonly toast = inject(ToastService);
  protected readonly credits = inject(CreditsService);
  protected readonly router = inject(Router);

  readonly busy = signal(false);

  protected async run(
    work: () => Promise<{ id: string }>,
    meta: { kind: JobKind; tool: string; title: string; params?: Record<string, unknown>; estimatedCredits?: number; thumbnail?: string | null },
    navigate = true,
  ): Promise<Job | null> {
    if (this.busy()) return null;
    this.busy.set(true);
    try {
      const created = await work();
      const job = this.jobs.track({ id: created.id, ...meta });
      void this.credits.refresh();
      await this.toast.success('Submitted — generating now');
      if (navigate) await this.router.navigate(['/job', job.id]);
      return job;
    } catch (e) {
      await this.toast.error(e);
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
