import { Component, computed, signal } from '@angular/core';
import { IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonTextarea, IonButton, IonIcon } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { JobCardComponent } from '../../shared/job-card.component';
import { ToolBase } from './tool-base';
import { PickedMedia } from '../../core/media.service';
import { SceneTask } from '../../core/models';
import { SCENE_PANO_CREDITS } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

type Mode = 'prompt' | 'panorama';

@Component({
  selector: 'app-scene',
  imports: [IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonTextarea, IonButton, IonIcon, PageHeaderComponent, SubmitBarComponent, MediaPickerComponent, OptionChipsComponent, JobCardComponent],
  template: `
    <vs-page-header title="Scene Model" back="/tabs/create"></vs-page-header>
    <ion-content>
      <div class="vs-hero" style="margin-top: 8px">
        <h1>3D scenes from text or 360°</h1>
        <p>Builds a Gaussian-splat (.spz) scene plus six initial views. Then render new camera angles and reconstruct an updated scene.</p>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Session</div>
        <ion-input label="Session ID" labelPlacement="stacked" fill="outline" [value]="sessionId()" (ionInput)="sessionId.set($any($event).detail.value ?? '')" autocapitalize="off"></ion-input>
        <p class="vs-help">One task runs per session at a time. Reuse the session to extend the same scene.</p>
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Create scene · {{ panoCredits }} credits</div>
        <ion-segment [value]="mode()" (ionChange)="mode.set($any($event).detail.value)" style="margin-bottom: 10px">
          <ion-segment-button value="prompt"><ion-label>From prompt</ion-label></ion-segment-button>
          <ion-segment-button value="panorama"><ion-label>From panorama</ion-label></ion-segment-button>
        </ion-segment>
        @if (mode() === 'prompt') {
          <ion-textarea class="prompt" [value]="prompt()" (ionInput)="prompt.set($any($event).detail.value ?? '')" autoGrow="true" rows="3" maxlength="1000"
            placeholder="A cozy cabin interior with a fireplace, snow outside the windows, warm evening light"></ion-textarea>
          <div class="vs-field" style="margin-top: 12px">
            <div class="vs-label">Quality</div>
            <vs-option-chips [options]="[{ value: 'fast', label: 'Fast' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]"
              [value]="quality()" (valueChange)="quality.set($any($event))"></vs-option-chips>
          </div>
          <vs-media-picker title="Reference images (optional)" hint="Up to 8 JPEG/PNG/WebP, 10 MiB each." kind="image" [max]="8" [(files)]="refFiles" [(url)]="refUrl"></vs-media-picker>
        } @else {
          <vs-media-picker title="360° panorama" hint="Equirectangular JPEG/PNG/WebP up to 50 MiB." kind="image" [(files)]="panoFiles" [(url)]="panoUrl"></vs-media-picker>
        }
      </div>

      <div class="vs-section">
        <div class="vs-section-title">Generate new views</div>
        <div class="vs-card vs-stack">
          <ion-input label="Reference batch IDs (comma separated)" labelPlacement="stacked" fill="outline" [value]="batchIds()" (ionInput)="batchIds.set($any($event).detail.value ?? '')" autocapitalize="off"
            placeholder="from a ready scene task → result.outputBatch.batchId"></ion-input>
          <div class="vs-grid-2">
            <ion-input label="X" labelPlacement="stacked" fill="outline" type="number" [value]="pos().x" (ionInput)="setPos('x', $any($event).detail.value)"></ion-input>
            <ion-input label="Y" labelPlacement="stacked" fill="outline" type="number" [value]="pos().y" (ionInput)="setPos('y', $any($event).detail.value)"></ion-input>
            <ion-input label="Z" labelPlacement="stacked" fill="outline" type="number" [value]="pos().z" (ionInput)="setPos('z', $any($event).detail.value)"></ion-input>
            <ion-input label="Yaw °" labelPlacement="stacked" fill="outline" type="number" [value]="pos().yaw" (ionInput)="setPos('yaw', $any($event).detail.value)"></ion-input>
            <ion-input label="Pitch °" labelPlacement="stacked" fill="outline" type="number" [value]="pos().pitch" (ionInput)="setPos('pitch', $any($event).detail.value)"></ion-input>
            <ion-input label="FOV °" labelPlacement="stacked" fill="outline" type="number" [value]="fov()" (ionInput)="fov.set($any($event).detail.value ?? '')" placeholder="model default"></ion-input>
          </div>
          <vs-option-chips [options]="[{ value: 'perspective', label: 'Perspective', hint: '1 credit' }, { value: 'pano', label: 'Panorama', hint: '6 credits' }]"
            [value]="projection()" (valueChange)="projection.set($any($event))"></vs-option-chips>
          <div class="vs-row">
            <ion-button size="small" fill="outline" [disabled]="!batchIds().trim() || busy()" (click)="generateViews()">
              <ion-icon slot="start" name="scan"></ion-icon>Generate views
            </ion-button>
            <ion-button size="small" fill="outline" [disabled]="!batchIds().trim() || busy()" (click)="reconstruct()">
              <ion-icon slot="start" name="cube"></ion-icon>Reconstruct .spz
            </ion-button>
          </div>
        </div>
      </div>

      @if (sceneJobs().length) {
        <div class="vs-section">
          <div class="vs-section-title">Scene tasks</div>
          <div class="vs-stack">
            @for (j of sceneJobs(); track j.id) {
              <vs-job-card [job]="j"></vs-job-card>
            }
          </div>
        </div>
      }
      <div style="height: 16px"></div>
    </ion-content>
    <vs-submit-bar [credits]="panoCredits" label="Build scene" [disabled]="!valid()" [busy]="busy()" (action)="createScene()"></vs-submit-bar>
  `,
})
export class ScenePage extends ToolBase {
  readonly panoCredits = SCENE_PANO_CREDITS;
  readonly sessionId = signal(`s-${Date.now().toString(36)}`);
  readonly mode = signal<Mode>('prompt');
  readonly prompt = signal('');
  readonly quality = signal<'fast' | 'low' | 'medium' | 'high'>('low');
  readonly refFiles = signal<PickedMedia[]>([]);
  readonly refUrl = signal('');
  readonly panoFiles = signal<PickedMedia[]>([]);
  readonly panoUrl = signal('');
  readonly batchIds = signal('');
  readonly pos = signal({ x: '0', y: '0', z: '0', yaw: '0', pitch: '0' });
  readonly fov = signal('');
  readonly projection = signal<'perspective' | 'pano'>('perspective');
  readonly sceneJobs = computed(() => this.jobs.recent().filter((j) => j.kind === 'scene'));

  setPos(k: 'x' | 'y' | 'z' | 'yaw' | 'pitch', v: string | null | undefined): void {
    this.pos.update((p) => ({ ...p, [k]: v ?? '' }));
  }

  valid(): boolean {
    if (!this.sessionId().trim()) return false;
    if (this.mode() === 'prompt') return !!this.prompt().trim();
    return this.panoFiles().length > 0 || !!this.panoUrl().trim();
  }

  async createScene(): Promise<void> {
    const sessionId = this.sessionId().trim();
    const work = async (): Promise<SceneTask> => {
      if (this.mode() === 'panorama') {
        if (this.panoFiles()[0]) return this.api.createScenePano({ sessionId, panorama: this.panoFiles()[0].file });
        return this.api.createScenePanoJson({ sessionId, panoramaUri: this.panoUrl().trim() });
      }
      if (this.refFiles().length) {
        const fields: FormInput = { sessionId, prompt: this.prompt().trim(), quality: this.quality(), referenceImageFiles: this.refFiles().map((f) => f.file) };
        return this.api.createScenePano(fields);
      }
      const body: Record<string, unknown> = { sessionId, prompt: this.prompt().trim(), quality: this.quality() };
      const urls = this.refUrl().split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      if (urls.length) body['referenceImages'] = urls;
      return this.api.createScenePanoJson(body);
    };
    await this.run(work, {
      kind: 'scene',
      tool: 'Scene · pano',
      title: this.mode() === 'prompt' ? this.prompt().trim() : `Panorama scene (${sessionId})`,
      estimatedCredits: SCENE_PANO_CREDITS,
    });
  }

  private batchList(): string[] {
    return this.batchIds().split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }

  async generateViews(): Promise<void> {
    const p = this.pos();
    const body: Record<string, unknown> = {
      sessionId: this.sessionId().trim(),
      referenceBatchIds: this.batchList(),
      targetPosition: { position: [Number(p.x), Number(p.y), Number(p.z)], yaw: Number(p.yaw), pitch: Number(p.pitch) },
      projection: this.projection(),
    };
    if (this.fov().trim()) body['fov'] = Number(this.fov());
    await this.run(() => this.api.generateSceneViews(body), {
      kind: 'scene',
      tool: 'Scene · generate',
      title: `${this.projection()} view @ (${p.x}, ${p.y}, ${p.z})`,
      estimatedCredits: this.projection() === 'pano' ? 6 : 1,
    });
  }

  async reconstruct(): Promise<void> {
    await this.run(() => this.api.reconstructScene({ sessionId: this.sessionId().trim(), referenceBatchIds: this.batchList() }), {
      kind: 'scene',
      tool: 'Scene · reconstruct',
      title: `Reconstruct ${this.sessionId()}`,
    });
  }
}
