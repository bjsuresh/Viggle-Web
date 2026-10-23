import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { ApiService } from './api.service';
import { JobsService } from './jobs.service';
import { SettingsService } from './settings.service';
import { ImageJob, Story, StoryPlan, StorySettings, Video } from './models';
import { h3VideoCredits } from './pricing';

const KEY = 'vs.stories';

/** Story Studio orchestration: plan → keyframes → clips → stitched film. */
@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly api = inject(ApiService);
  private readonly jobs = inject(JobsService);
  private readonly settings = inject(SettingsService);

  readonly stories = signal<Story[]>([]);
  readonly sorted = computed(() => [...this.stories()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  /** story id → running flag */
  readonly running = signal<Record<string, boolean>>({});

  async load(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (value) this.stories.set(JSON.parse(value));
    } catch {
      /* ignore */
    }
  }

  get(id: string): Story | undefined {
    return this.stories().find((s) => s.id === id);
  }

  async plan(input: { idea: string; scenes: number; style: string; tone: string; characters?: string; language: string }, settings: StorySettings): Promise<Story> {
    const plan: StoryPlan = await this.api.planStory({
      ...input,
      duration_s: settings.duration_s,
      aspect_ratio: settings.aspect_ratio,
    });
    const story: Story = {
      id: `story_${Date.now().toString(36)}`,
      title: plan.title,
      logline: plan.logline,
      style_guide: plan.style_guide,
      idea: input.idea,
      scenes: plan.scenes.map((s) => ({ ...s })),
      settings,
      planner: plan.planner,
      createdAt: new Date().toISOString(),
    };
    this.stories.update((l) => [story, ...l]);
    await this.persist();
    return story;
  }

  update(id: string, patch: Partial<Story>): void {
    this.stories.update((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    void this.persist();
  }

  updateScene(id: string, index: number, patch: Partial<Story['scenes'][number]>): void {
    const story = this.get(id);
    if (!story) return;
    const scenes = story.scenes.map((s, i) => (i === index ? { ...s, ...patch } : s));
    this.update(id, { scenes });
  }

  remove(id: string): void {
    this.stories.update((l) => l.filter((s) => s.id !== id));
    void this.persist();
  }

  estimateCredits(story: Story): number {
    const perClip = h3VideoCredits(story.settings.duration_s, story.settings.resolution);
    const images = story.settings.useKeyframes ? story.scenes.length : 0;
    return story.scenes.length * perClip + images;
  }

  /** Generate every scene that has no finished clip yet. Runs scenes sequentially to stay within rate limits. */
  async generateAll(id: string, onProgress?: (msg: string) => void): Promise<void> {
    this.running.update((r) => ({ ...r, [id]: true }));
    try {
      const story = this.get(id);
      if (!story) return;
      for (let i = 0; i < story.scenes.length; i++) {
        const current = this.get(id)!;
        if (current.scenes[i].videoUrl) continue;
        onProgress?.(`Scene ${i + 1} of ${story.scenes.length}`);
        await this.generateScene(id, i);
      }
    } finally {
      this.running.update((r) => ({ ...r, [id]: false }));
    }
  }

  async generateScene(id: string, index: number): Promise<void> {
    const story = this.get(id);
    if (!story) return;
    const scene = story.scenes[index];
    const s = story.settings;
    const watermark = this.settings.settings().watermark;

    let keyframeUrl = scene.keyframeUrl ?? null;
    if (s.useKeyframes && !keyframeUrl) {
      const img = await this.api.createImage({
        prompt: `${scene.image_prompt}. ${story.style_guide}`,
        aspect_ratio: imageAspect(s.aspect_ratio),
        resolution: '1K',
        n: 1,
      });
      this.jobs.track({ id: img.id, kind: 'image', tool: 'Story keyframe', title: scene.title, storyId: id, sceneIndex: index, estimatedCredits: 1 });
      this.updateScene(id, index, { imageJobId: img.id });
      const done = await this.jobs.waitFor(img.id, 3000);
      if (done.status !== 'ready') throw new Error(`Keyframe for scene ${index + 1} ${done.status}: ${done.error?.message ?? ''}`);
      keyframeUrl = (done.result as ImageJob).images[0]?.url ?? null;
      this.updateScene(id, index, { keyframeUrl });
    }

    const payload: Record<string, string | number | boolean | undefined> = {
      prompt: `${scene.video_prompt}. ${story.style_guide}`,
      quality: s.quality,
      duration_s: s.duration_s,
      resolution: s.resolution,
      aspect_ratio: s.aspect_ratio,
      enhance: s.enhance,
      watermark,
    };
    if (keyframeUrl) payload['first_frame_image_url'] = keyframeUrl;
    const vid = await this.api.createVideo(payload);
    this.jobs.track({
      id: vid.id,
      kind: 'video',
      tool: 'Story clip',
      title: `${story.title} — ${scene.title}`,
      storyId: id,
      sceneIndex: index,
      params: payload,
      estimatedCredits: h3VideoCredits(s.duration_s, s.resolution),
      thumbnail: keyframeUrl,
    });
    this.updateScene(id, index, { videoJobId: vid.id });
    const done = await this.jobs.waitFor(vid.id, 5000);
    if (done.status !== 'ready') throw new Error(`Scene ${index + 1} ${done.status}: ${done.error?.message ?? ''}`);
    this.updateScene(id, index, { videoUrl: (done.result as Video).video_url });
  }

  /** Re-read fresh signed URLs for every clip (links expire after one hour). */
  async refreshClipUrls(id: string): Promise<string[]> {
    const story = this.get(id);
    if (!story) return [];
    const urls: string[] = [];
    for (let i = 0; i < story.scenes.length; i++) {
      const sc = story.scenes[i];
      if (!sc.videoJobId) continue;
      const v = await this.api.getVideo(sc.videoJobId);
      if (v.video_url) {
        urls.push(v.video_url);
        this.updateScene(id, i, { videoUrl: v.video_url });
      }
    }
    return urls;
  }

  async stitch(id: string): Promise<string> {
    const story = this.get(id);
    if (!story) throw new Error('Story not found');
    this.update(id, { stitching: true });
    try {
      const clips = await this.refreshClipUrls(id);
      if (!clips.length) throw new Error('No finished clips to stitch yet');
      const r = await this.api.stitchStory({ clips, aspect_ratio: story.settings.aspect_ratio, resolution: '1080p' });
      const url = this.settings.absolute(r.url);
      this.update(id, { stitchedUrl: url, stitching: false });
      return url;
    } catch (e) {
      this.update(id, { stitching: false });
      throw e;
    }
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify(this.stories().slice(0, 100)) });
  }
}

function imageAspect(ar: string): string {
  return ar === '21:9' ? '16:9' : ar;
}
