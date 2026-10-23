import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';
import {
  ApiErrorResponse,
  Asset,
  AssetList,
  CharacterExport,
  Credits,
  ImageJob,
  MotionExport,
  MotionTemplate,
  SceneTask,
  StoryPlan,
  Video,
  VideoCreateResponse,
  VideoList,
  ViggleErrorBody,
} from './models';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ViggleErrorBody,
  ) {
    super(body.message || `HTTP ${status}`);
  }
  get code(): string {
    return this.body.code;
  }
  get retryable(): boolean {
    return !!this.body.retryable;
  }
}

export type FormValue = string | number | boolean | Blob | File | null | undefined;
export type FormInput = Record<string, FormValue | FormValue[]>;

/** Thin typed client for the Node backend (which proxies Viggle). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  /** 0-100 while a multipart upload is in flight, null otherwise. */
  readonly uploadProgress = signal<number | null>(null);

  private url(path: string): string {
    return `${this.settings.serverUrl()}/api${path}`;
  }

  private headers(): Record<string, string> {
    const token = this.settings.settings().appToken;
    return token ? { 'x-app-token': token } : {};
  }

  private wrap(err: unknown): never {
    if (err instanceof HttpErrorResponse) {
      const body = (err.error ?? {}) as Partial<ApiErrorResponse>;
      const e = body.error ?? {
        code: err.status === 0 ? 'NETWORK' : 'HTTP_' + err.status,
        message: err.status === 0 ? 'Cannot reach the server. Check Settings → Server URL.' : err.message,
        retryable: err.status === 0 || err.status >= 500,
      };
      throw new ApiError(err.status, e);
    }
    throw err;
  }

  async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
    }
    try {
      return await firstValueFrom(this.http.get<T>(this.url(path), { headers: this.headers(), params: hp }));
    } catch (e) {
      this.wrap(e);
    }
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(this.url(path), body, { headers: this.headers() }));
    } catch (e) {
      this.wrap(e);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.delete<T>(this.url(path), { headers: this.headers() }));
    } catch (e) {
      this.wrap(e);
    }
  }

  /** Multipart POST with upload progress. Arrays become repeated fields; empty values are skipped. */
  async postForm<T>(path: string, input: FormInput): Promise<T> {
    const fd = new FormData();
    for (const [key, raw] of Object.entries(input)) {
      const values = Array.isArray(raw) ? raw : [raw];
      for (const v of values) {
        if (v === undefined || v === null || v === '') continue;
        if (v instanceof Blob) {
          const name = (v as File).name || `${key}.${guessExt(v.type)}`;
          fd.append(key, v, name);
        } else {
          fd.append(key, String(v));
        }
      }
    }
    this.uploadProgress.set(0);
    try {
      return await new Promise<T>((resolve, reject) => {
        this.http
          .post<T>(this.url(path), fd, { headers: this.headers(), reportProgress: true, observe: 'events' })
          .subscribe({
            next: (ev) => {
              if (ev.type === HttpEventType.UploadProgress && ev.total) {
                this.uploadProgress.set(Math.round((ev.loaded / ev.total) * 100));
              } else if (ev.type === HttpEventType.Response) {
                resolve(ev.body as T);
              }
            },
            error: reject,
          });
      });
    } catch (e) {
      this.wrap(e);
    } finally {
      this.uploadProgress.set(null);
    }
  }

  /* ---------- Typed endpoints ---------- */

  credits(): Promise<Credits> {
    return this.get<Credits>('/credits');
  }

  createVideo(input: FormInput): Promise<VideoCreateResponse> {
    return this.postForm<VideoCreateResponse>('/videos', input);
  }
  upscaleVideo(input: FormInput): Promise<VideoCreateResponse> {
    return this.postForm<VideoCreateResponse>('/videos/super-resolution', input);
  }
  getVideo(id: string): Promise<Video> {
    return this.get<Video>(`/videos/${encodeURIComponent(id)}`);
  }
  listVideos(params: { status?: string; cursor?: string | null; limit?: number } = {}): Promise<VideoList> {
    return this.get<VideoList>('/videos', params);
  }

  createImage(input: FormInput): Promise<ImageJob> {
    return this.postForm<ImageJob>('/images', input);
  }
  getImage(id: string): Promise<ImageJob> {
    return this.get<ImageJob>(`/images/${encodeURIComponent(id)}`);
  }

  createCharacter(input: FormInput): Promise<Asset> {
    return this.postForm<Asset>('/characters', input);
  }
  listCharacters(): Promise<AssetList> {
    return this.get<AssetList>('/characters');
  }
  getCharacter(id: string): Promise<Asset> {
    return this.get<Asset>(`/characters/${encodeURIComponent(id)}`);
  }
  deleteCharacter(id: string): Promise<unknown> {
    return this.delete(`/characters/${encodeURIComponent(id)}`);
  }
  exportCharacter(id: string, downloadType?: 'vsplat'): Promise<CharacterExport> {
    return this.get<CharacterExport>(`/characters/${encodeURIComponent(id)}/export`, { download_type: downloadType });
  }

  createMotion(input: FormInput): Promise<Asset> {
    return this.postForm<Asset>('/motions', input);
  }
  createMotionFromText(body: { text: string; duration_seconds?: number; guidance_scale?: number; smooth?: boolean; name?: string }): Promise<Asset> {
    return this.postJson<Asset>('/motions', body);
  }
  importMotion(body: { template_id: string; name?: string; model?: string }): Promise<Asset> {
    return this.postJson<Asset>('/motions/import', body);
  }
  listMotionTemplates(): Promise<unknown> {
    return this.get<unknown>('/motions/templates');
  }
  listMotions(): Promise<AssetList> {
    return this.get<AssetList>('/motions');
  }
  getMotion(id: string): Promise<Asset> {
    return this.get<Asset>(`/motions/${encodeURIComponent(id)}`);
  }
  deleteMotion(id: string): Promise<unknown> {
    return this.delete(`/motions/${encodeURIComponent(id)}`);
  }
  exportMotion(id: string, downloadType?: 'glb' | 'fbx'): Promise<MotionExport> {
    return this.get<MotionExport>(`/motions/${encodeURIComponent(id)}/export`, { download_type: downloadType });
  }

  createRender(input: FormInput): Promise<VideoCreateResponse> {
    return this.postForm<VideoCreateResponse>('/renders', input);
  }
  renderEventsUrl(id: string): string {
    const token = this.settings.settings().appToken;
    return `${this.url(`/renders/${encodeURIComponent(id)}/events`)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  createScenePano(input: FormInput): Promise<SceneTask> {
    return this.postForm<SceneTask>('/scenes/pano', input);
  }
  createScenePanoJson(body: Record<string, unknown>): Promise<SceneTask> {
    return this.postJson<SceneTask>('/scenes/pano', body);
  }
  generateSceneViews(body: Record<string, unknown>): Promise<SceneTask> {
    return this.postJson<SceneTask>('/scenes/generate', body);
  }
  reconstructScene(body: Record<string, unknown>): Promise<SceneTask> {
    return this.postJson<SceneTask>('/scenes/reconstruct', body);
  }
  getScene(id: string): Promise<SceneTask> {
    return this.get<SceneTask>(`/scenes/${encodeURIComponent(id)}`);
  }

  planStory(body: Record<string, unknown>): Promise<StoryPlan> {
    return this.postJson<StoryPlan>('/stories/plan', body);
  }
  stitchCapabilities(): Promise<{ available: boolean }> {
    return this.get<{ available: boolean }>('/stories/stitch/capabilities');
  }
  stitchStory(body: { clips: string[]; aspect_ratio: string; resolution?: string }): Promise<{ id: string; url: string; bytes: number }> {
    return this.postJson('/stories/stitch', body);
  }

  health(): Promise<{ ok: boolean; viggleKey: boolean; storyAi: boolean }> {
    return firstValueFrom(this.http.get<{ ok: boolean; viggleKey: boolean; storyAi: boolean }>(`${this.settings.serverUrl()}/health`));
  }

  /** Normalise an unknown MotionTemplate list payload into an array. */
  static templatesFrom(payload: unknown): MotionTemplate[] {
    if (Array.isArray(payload)) return payload as MotionTemplate[];
    const o = payload as Record<string, unknown>;
    for (const k of ['data', 'items', 'templates']) {
      if (Array.isArray(o?.[k])) return o[k] as MotionTemplate[];
    }
    return [];
  }
}

function guessExt(mime: string): string {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  };
  return m[mime] ?? 'bin';
}
