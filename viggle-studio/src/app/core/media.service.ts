import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { SettingsService } from './settings.service';

export interface PickedMedia {
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
  /** Seconds, when known (videos only). */
  durationS?: number;
}

/** Picking images/videos from the device and saving/sharing results. Works on web and native. */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly settings = inject(SettingsService);

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async pickImages(limit = 1): Promise<PickedMedia[]> {
    if (this.isNative) {
      const res = await Camera.pickImages({ limit, quality: 92 });
      const out: PickedMedia[] = [];
      for (const p of res.photos) {
        const file = await this.fileFromPath(p.path ?? p.webPath, `photo-${Date.now()}.${p.format || 'jpg'}`, `image/${p.format || 'jpeg'}`);
        out.push({ file, previewUrl: URL.createObjectURL(file), kind: 'image' });
      }
      return out;
    }
    const files = await this.browserPick('image/*', limit > 1);
    return files.slice(0, limit).map((file) => ({ file, previewUrl: URL.createObjectURL(file), kind: 'image' as const }));
  }

  async takePhoto(): Promise<PickedMedia | null> {
    const p = await Camera.getPhoto({ resultType: CameraResultType.Uri, source: CameraSource.Camera, quality: 92 });
    if (!p.webPath && !p.path) return null;
    const file = await this.fileFromPath(p.path ?? p.webPath, `camera-${Date.now()}.${p.format || 'jpg'}`, `image/${p.format || 'jpeg'}`);
    return { file, previewUrl: URL.createObjectURL(file), kind: 'image' };
  }

  async pickVideo(): Promise<PickedMedia | null> {
    let file: File | null = null;
    if (this.isNative) {
      const res = await FilePicker.pickVideos({ limit: 1 });
      const f = res.files[0];
      if (!f) return null;
      file = f.blob
        ? new File([f.blob], f.name, { type: f.mimeType })
        : await this.fileFromPath(f.path, f.name, f.mimeType);
    } else {
      const files = await this.browserPick('video/*', false);
      file = files[0] ?? null;
    }
    if (!file) return null;
    const previewUrl = URL.createObjectURL(file);
    const durationS = await probeDuration(previewUrl).catch(() => undefined);
    return { file, previewUrl, kind: 'video', durationS };
  }

  /** Save a remote (signed) result to the device and offer the share sheet. */
  async saveAndShare(url: string, filename: string): Promise<void> {
    const proxied = this.settings.proxied(url, filename);
    if (!this.isNative) {
      const a = document.createElement('a');
      a.href = proxied;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const res = await Filesystem.downloadFile({
      url: proxied,
      path: `ViggleStudio/${filename}`,
      directory: Directory.Cache,
      recursive: true,
    });
    const path = res.path;
    if (!path) throw new Error('Download failed');
    const can = await Share.canShare();
    if (can.value) {
      await Share.share({ title: filename, files: [path] });
    }
  }

  async openExternal(url: string): Promise<void> {
    if (this.isNative) await Browser.open({ url });
    else window.open(url, '_blank', 'noopener');
  }

  private async fileFromPath(path: string | undefined, name: string, mime: string): Promise<File> {
    if (!path) throw new Error('No file path returned by picker');
    const src = path.startsWith('http') || path.startsWith('blob:') ? path : Capacitor.convertFileSrc(path);
    const blob = await fetch(src).then((r) => r.blob());
    return new File([blob], name, { type: blob.type || mime });
  }

  private browserPick(accept: string, multiple: boolean): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = 'none';
      input.onchange = () => {
        resolve(Array.from(input.files ?? []));
        input.remove();
      };
      input.oncancel = () => {
        resolve([]);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    });
  }
}

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => reject(new Error('cannot read video'));
    v.src = url;
  });
}
