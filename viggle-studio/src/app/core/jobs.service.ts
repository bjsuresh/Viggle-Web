import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { ApiService } from './api.service';
import { SettingsService } from './settings.service';
import { Asset, ImageJob, Job, JobKind, JobStatus, SceneTask, Video } from './models';

const KEY = 'vs.jobs';
const TERMINAL: JobStatus[] = ['ready', 'failed', 'cancelled'];

/** Local registry of every job created from this device, with background polling. */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly api = inject(ApiService);
  private readonly settings = inject(SettingsService);

  readonly jobs = signal<Job[]>([]);
  readonly active = computed(() => this.jobs().filter((j) => !TERMINAL.includes(j.status)));
  readonly recent = computed(() => [...this.jobs()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly videos = computed(() => this.recent().filter((j) => j.kind === 'video' || j.kind === 'render'));
  readonly images = computed(() => this.recent().filter((j) => j.kind === 'image'));

  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) this.jobs.set(JSON.parse(value));
    } catch {
      /* ignore corrupt storage */
    }
    this.schedule();
  }

  get(id: string): Job | undefined {
    return this.jobs().find((j) => j.id === id);
  }

  /** Register a freshly created job and start polling it. */
  track(job: Omit<Job, 'createdAt' | 'status' | 'progress'> & Partial<Pick<Job, 'createdAt' | 'status' | 'progress'>>): Job {
    const full: Job = {
      createdAt: new Date().toISOString(),
      status: 'queued',
      progress: null,
      ...job,
    };
    this.jobs.update((list) => [full, ...list.filter((j) => j.id !== full.id)]);
    void this.persist();
    this.schedule(500);
    return full;
  }

  patch(id: string, patch: Partial<Job>): void {
    this.jobs.update((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    void this.persist();
  }

  remove(id: string): void {
    this.jobs.update((list) => list.filter((j) => j.id !== id));
    void this.persist();
  }

  clearFinished(): void {
    this.jobs.update((list) => list.filter((j) => !TERMINAL.includes(j.status)));
    void this.persist();
  }

  /** Fetch the latest state of one job from the API and merge it (also refreshes signed URLs). */
  async refresh(id: string): Promise<Job | undefined> {
    const job = this.get(id);
    if (!job) return undefined;
    const result = await this.fetchStatus(job.kind, id);
    const merged = this.merge(job, result);
    this.jobs.update((list) => list.map((j) => (j.id === id ? merged : j)));
    void this.persist();
    return merged;
  }

  /** Poll until the job reaches a terminal state. Resolves with the final job. */
  async waitFor(id: string, intervalMs = 4000, timeoutMs = 30 * 60 * 1000): Promise<Job> {
    const start = Date.now();
    for (;;) {
      const job = await this.refresh(id);
      if (!job) throw new Error(`Job ${id} is no longer tracked`);
      if (TERMINAL.includes(job.status)) return job;
      if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${id}`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  private async fetchStatus(kind: JobKind, id: string): Promise<Video | ImageJob | Asset | SceneTask> {
    switch (kind) {
      case 'image':
        return this.api.getImage(id);
      case 'character':
        return this.api.getCharacter(id);
      case 'motion':
        return this.api.getMotion(id);
      case 'scene':
        return this.api.getScene(id);
      default:
        return this.api.getVideo(id);
    }
  }

  private merge(job: Job, r: Video | ImageJob | Asset | SceneTask): Job {
    const status = (r as { status: JobStatus }).status;
    const progress = (r as { progress?: number | null }).progress ?? null;
    const stage = (r as Video).stage ?? null;
    const error = (r as { error?: Job['error'] }).error ?? null;
    const completedRaw = (r as { completed_at?: string | null; completedAt?: number | null });
    const completedAt =
      completedRaw.completed_at ??
      (typeof completedRaw.completedAt === 'number' ? new Date(completedRaw.completedAt).toISOString() : null);
    let thumbnail = job.thumbnail ?? null;
    if (job.kind === 'image') {
      const first = (r as ImageJob).images?.[0];
      if (first?.url) thumbnail = first.url;
    }
    return { ...job, status, progress, stage, error, completedAt, result: r, thumbnail };
  }

  private schedule(delay = this.settings.settings().pollIntervalMs): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delay);
  }

  private async tick(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const pending = this.active();
      for (const job of pending) {
        try {
          await this.refresh(job.id);
        } catch (err) {
          const status = (err as { status?: number }).status;
          if (status === 404) this.patch(job.id, { status: 'failed', error: { code: 'NOT_FOUND', message: 'Job not found' } });
        }
      }
    } finally {
      this.polling = false;
      if (this.active().length) this.schedule();
      else this.schedule(15000);
    }
  }

  private async persist(): Promise<void> {
    const slim = this.jobs()
      .slice(0, 300)
      .map((j) => ({ ...j, result: j.result && TERMINAL.includes(j.status) ? j.result : null }));
    await Preferences.set({ key: KEY, value: JSON.stringify(slim) });
  }
}

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.includes(status);
}
