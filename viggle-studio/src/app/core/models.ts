/** Shared types mirroring the Viggle V1 API. */

export type JobStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'cancelled';

export interface ViggleErrorBody {
  code: string;
  message: string;
  retryable?: boolean;
  request_id?: string | null;
  details?: Record<string, unknown>;
  remediation?: { action?: string; retry_after_ms?: number | null };
}

export interface ApiErrorResponse {
  error: ViggleErrorBody;
}

export type VideoQuality = 'low' | 'high';
export type VideoResolution = '480p' | '768p' | '1080p' | '2k' | '4k';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
export type ImageAspect = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
export type ImageResolution = '1K' | '2K';
export type EnhanceMode = 'planner' | 'normal' | 'agent';
export type BackgroundMode = 'original' | 'solid' | 'transparent';
export type CharacterType = 'render' | 'vsplat' | 'all';
export type MotionType = 'render' | 'glb' | 'all';
export type ViggleModel = 'V3' | 'V3_Preview' | 'V4' | 'V4_Preview' | 'V4_BaseSG';

export const VIDEO_RESOLUTIONS: VideoResolution[] = ['480p', '768p', '1080p', '2k', '4k'];
export const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
export const IMAGE_ASPECTS: ImageAspect[] = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];
export const VIGGLE_MODELS: ViggleModel[] = ['V4', 'V4_Preview', 'V4_BaseSG', 'V3', 'V3_Preview'];

export interface VideoCreateResponse {
  id: string;
  status: JobStatus;
  progress: number | null;
  created_at: string | null;
}

export interface Video {
  id: string;
  status: JobStatus;
  stage: string | null;
  progress: number | null;
  video_url: string | null;
  alpha_url: string | null;
  created_at: string | null;
  completed_at: string | null;
  error: ViggleErrorBody | null;
  seed?: number;
  queue_position?: number | null;
  estimated_wait_seconds?: number | null;
}

export interface VideoListItem {
  id: string;
  status: JobStatus;
  stage: string | null;
  progress: number | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface VideoList {
  items: VideoListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface GeneratedImage {
  url: string | null;
  width: number;
  height: number;
  seed: number;
}

export interface ImageJob {
  id: string;
  status: Exclude<JobStatus, 'cancelled'>;
  model: string;
  progress: number | null;
  images: GeneratedImage[];
  created_at: string | null;
  completed_at: string | null;
  error: ViggleErrorBody | null;
}

export interface SubExtraction {
  status: JobStatus;
  error: ViggleErrorBody | null;
  skeletons?: string[];
}

export interface Asset {
  id: string;
  status: JobStatus;
  name: string;
  progress: number | null;
  capabilities: string[];
  created_at: string | null;
  completed_at: string | null;
  error: ViggleErrorBody | null;
  type: CharacterType | MotionType;
  vsplat: SubExtraction | null;
  glb: SubExtraction | null;
}

export interface AssetList {
  data: Asset[];
}

export interface CharacterExport {
  id: string;
  status: JobStatus;
  download_type: string | null;
  vsplat_url: string | null;
  thumbnail_url: string | null;
  error: ViggleErrorBody | null;
}

export interface MotionExport {
  id: string;
  status: JobStatus;
  download_type: string | null;
  mixamo_url: string | null;
  metahuman_url: string | null;
  metahuman_body_url: string | null;
  error: ViggleErrorBody | null;
}

export interface MotionTemplate {
  id?: string;
  template_id?: string;
  uuid?: string;
  name?: string;
  title?: string;
  thumbnail_url?: string;
  preview_url?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface SceneFile {
  url: string;
}
export interface SceneView {
  index: number;
  url: string;
  c2w: number[][];
  intrinsic: number[];
}
export interface SceneBatch {
  batchId: string;
  createdAt: number;
  manifest: SceneFile;
  kind?: 'initial' | 'generated';
  views?: SceneView[];
}
export interface SceneResult {
  operation: 'pano' | 'generate' | 'reconstruct';
  sessionId: string;
  spz: SceneFile | null;
  preview: SceneFile | null;
  panorama: SceneFile | null;
  outputBatch: SceneBatch | null;
  referenceViewCount: number;
  newViewCount: number;
}
export interface SceneTask {
  id: string;
  sessionId: string;
  operation: 'pano' | 'generate' | 'reconstruct';
  status: JobStatus;
  queuePosition?: number;
  credits: number;
  createdAt: number | null;
  completedAt: number | null;
  result: SceneResult | null;
  error: ViggleErrorBody | null;
}

export interface Credits {
  balance: number;
}

/* ---------- Local job registry ---------- */

export type JobKind = 'video' | 'image' | 'character' | 'motion' | 'render' | 'scene';

export interface Job {
  id: string;
  kind: JobKind;
  tool: string;
  title: string;
  status: JobStatus;
  progress: number | null;
  stage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  error?: ViggleErrorBody | null;
  params?: Record<string, unknown>;
  estimatedCredits?: number;
  /** Latest raw status payload from the API (signed URLs expire after 1h, so refresh on view). */
  result?: Video | ImageJob | Asset | SceneTask | null;
  storyId?: string;
  sceneIndex?: number;
  thumbnail?: string | null;
}

/* ---------- Story studio ---------- */

export interface StoryScenePlan {
  title: string;
  narration: string;
  video_prompt: string;
  image_prompt: string;
  camera: string;
  mood: string;
}

export interface StoryPlan {
  title: string;
  logline: string;
  style_guide: string;
  scenes: StoryScenePlan[];
  planner: 'claude' | 'template';
}

export interface StoryScene extends StoryScenePlan {
  imageJobId?: string;
  keyframeUrl?: string | null;
  videoJobId?: string;
  videoUrl?: string | null;
}

export interface StorySettings {
  quality: VideoQuality;
  duration_s: number;
  resolution: VideoResolution;
  aspect_ratio: AspectRatio;
  useKeyframes: boolean;
  enhance: boolean;
}

export interface Story {
  id: string;
  title: string;
  logline: string;
  style_guide: string;
  idea: string;
  scenes: StoryScene[];
  settings: StorySettings;
  planner: 'claude' | 'template';
  createdAt: string;
  stitchedUrl?: string | null;
  stitching?: boolean;
}
