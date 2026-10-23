import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonInput, IonTextarea, IonToggle, IonItem, IonLabel, IonNote, IonSpinner, IonRange, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { ToolBase } from '../tools/tool-base';
import { MediaService, PickedMedia } from '../../core/media.service';
import { Asset, MotionTemplate, MotionType, VIGGLE_MODELS, ViggleModel } from '../../core/models';
import { TEXT_TO_MOTION_CREDITS, motionCredits } from '../../core/pricing';
import { ApiService, FormInput } from '../../core/api.service';

type Mode = 'video' | 'text' | 'import';

@Component({
  selector: 'app-motions',
  imports: [DatePipe, IonContent, IonButton, IonIcon, IonInput, IonTextarea, IonToggle, IonItem, IonLabel, IonNote, IonSpinner, IonRange, IonSegment, IonSegmentButton, IonRefresher, IonRefresherContent, PageHeaderComponent, MediaPickerComponent, OptionChipsComponent, SubmitBarComponent],
  template: `
    <vs-page-header title="Motions" back="/tabs/create"></vs-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>

      <div class="vs-section" style="margin-top: 4px">
        <div class="vs-section-title">
          Your motions
          <span class="link" (click)="showForm.set(!showForm())">{{ showForm() ? 'Hide form' : '+ New motion' }}</span>
        </div>
        @if (loading()) {
          <div class="vs-row" style="justify-content:center;padding:20px"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (!list().length) {
          <div class="vs-empty">
            <ion-icon name="body"></ion-icon>
            <h3>No motions yet</h3>
            <p>Capture motion from a video, generate it from text, or import an official Viggle template.</p>
          </div>
        } @else {
          <div class="vs-stack">
            @for (m of list(); track m.id) {
              <div class="vs-card">
                <div class="vs-row">
                  <div style="min-width:0">
                    <div class="name">{{ m.name || 'Untitled' }}</div>
                    <div class="id">{{ m.id }} · {{ m.type }} · {{ m.created_at | date: 'MMM d' }}</div>
                  </div>
                  <span class="vs-pill" [class.ok]="m.status === 'ready'" [class.bad]="m.status === 'failed'" [class.busy]="m.status === 'queued' || m.status === 'processing'">{{ m.status }}</span>
                </div>
                @if (m.glb) {
                  <div class="vs-help">3D animation: {{ m.glb.status }}{{ m.glb.skeletons?.length ? ' · ' + m.glb.skeletons!.join(', ') : '' }}</div>
                }
                <div class="actions">
                  @if (m.glb?.status === 'ready') {
                    <ion-button size="small" fill="outline" (click)="exportMotion(m, 'glb')"><ion-icon slot="start" name="download"></ion-icon>GLB</ion-button>
                    <ion-button size="small" fill="outline" (click)="exportMotion(m, 'fbx')"><ion-icon slot="start" name="download"></ion-icon>FBX</ion-button>
                  }
                  <ion-button size="small" fill="outline" (click)="copy(m.id)"><ion-icon slot="start" name="copy"></ion-icon>Copy ID</ion-button>
                  <ion-button size="small" fill="clear" color="danger" (click)="remove(m)"><ion-icon slot="icon-only" name="trash"></ion-icon></ion-button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (showForm()) {
        <div class="vs-section">
          <div class="vs-section-title">New motion</div>
          <ion-segment [value]="mode()" (ionChange)="mode.set($any($event).detail.value)" style="margin-bottom: 12px">
            <ion-segment-button value="video"><ion-label>From video</ion-label></ion-segment-button>
            <ion-segment-button value="text"><ion-label>From text</ion-label></ion-segment-button>
            <ion-segment-button value="import"><ion-label>Template</ion-label></ion-segment-button>
          </ion-segment>

          <div class="vs-stack">
            <ion-input label="Name" labelPlacement="stacked" fill="outline" [value]="name()" (ionInput)="name.set($any($event).detail.value ?? '')" placeholder="e.g. Hip-hop groove"></ion-input>

            @switch (mode()) {
              @case ('video') {
                <vs-media-picker title="Motion video" hint="A person performing the movement. Max 100 MiB." kind="video" [(files)]="files" [(url)]="url"></vs-media-picker>
                <div class="vs-field">
                  <div class="vs-label">Type</div>
                  <vs-option-chips [options]="[{ value: 'render', label: '2D motion', hint: 'free' }, { value: 'glb', label: '3D animation', hint: '5 cr/s' }, { value: 'all', label: 'Both', hint: '5 cr/s' }]"
                    [value]="type()" (valueChange)="type.set($any($event))"></vs-option-chips>
                </div>
                @if (type() !== 'render') {
                  <ion-item lines="none">
                    <ion-toggle [checked]="smoothing()" (ionChange)="smoothing.set($any($event).detail.checked)">
                      <ion-label>Smooth joints</ion-label><ion-note>Reduces jitter, may soften fast moves</ion-note>
                    </ion-toggle>
                  </ion-item>
                  <ion-input label="Target FPS" labelPlacement="stacked" fill="outline" type="number" [value]="fps()" (ionInput)="fps.set($any($event).detail.value ?? '')"></ion-input>
                }
                <details class="vs-advanced">
                  <summary>Model</summary>
                  <vs-option-chips [options]="modelOptions" [value]="model()" (valueChange)="model.set($any($event))"></vs-option-chips>
                </details>
              }
              @case ('text') {
                <ion-textarea class="prompt" [value]="text()" (ionInput)="text.set($any($event).detail.value ?? '')" autoGrow="true" rows="3" maxlength="400"
                  placeholder="A person walks forward confidently, then turns left and waves with the right hand"></ion-textarea>
                <div class="vs-field">
                  <div class="vs-label">Duration <small>{{ seconds() }} s</small></div>
                  <ion-range min="3" max="60" step="1" pin="true" [value]="seconds()" (ionChange)="seconds.set($any($event).detail.value)"></ion-range>
                </div>
                <div class="vs-field">
                  <div class="vs-label">Guidance scale <small>{{ guidance() }}</small></div>
                  <ion-range min="0" max="30" step="0.5" pin="true" [value]="guidance()" (ionChange)="guidance.set($any($event).detail.value)"></ion-range>
                </div>
                <ion-item lines="none">
                  <ion-toggle [checked]="smoothText()" (ionChange)="smoothText.set($any($event).detail.checked)"><ion-label>Smooth animation</ion-label></ion-toggle>
                </ion-item>
                <p class="vs-help">Flat 10 credits regardless of duration. Produces a 3D GLB with Mixamo and MetaHuman rigs.</p>
              }
              @case ('import') {
                <ion-input label="Template ID" labelPlacement="stacked" fill="outline" [value]="templateId()" (ionInput)="templateId.set($any($event).detail.value ?? '')" autocapitalize="off" placeholder="official Viggle motion template id"></ion-input>
                <div class="vs-row">
                  <ion-button size="small" fill="outline" (click)="loadTemplates()" [disabled]="loadingTemplates()">
                    <ion-icon slot="start" name="albums"></ion-icon>{{ loadingTemplates() ? 'Loading…' : 'Browse templates' }}
                  </ion-button>
                  <vs-option-chips [options]="importModels" [value]="importModel()" (valueChange)="importModel.set($any($event))"></vs-option-chips>
                </div>
                @if (templates().length) {
                  <div class="tpl-grid">
                    @for (t of templates(); track $index) {
                      <button type="button" class="tpl" [class.active]="templateId() === tplId(t)" (click)="templateId.set(tplId(t))">
                        @if (t.thumbnail_url) { <img [src]="t.thumbnail_url" alt="" /> }
                        <span>{{ t.name || t.title || tplId(t) }}</span>
                      </button>
                    }
                  </div>
                } @else if (templatesError()) {
                  <p class="vs-help">{{ templatesError() }}</p>
                }
                <p class="vs-help">1 credit per second of template duration (min 1).</p>
              }
            }
          </div>
        </div>
      }
      <div style="height: 16px"></div>
    </ion-content>
    @if (showForm()) {
      <vs-submit-bar [credits]="cost()" [label]="mode() === 'import' ? 'Import motion' : 'Create motion'" [disabled]="!valid()" [busy]="busy()" (action)="create()"></vs-submit-bar>
    }
  `,
  styles: [
    `
      .name { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .id { font-size: 11px; color: var(--vs-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
      .tpl { border: 1px solid var(--vs-border); background: var(--vs-surface-2); border-radius: 12px; padding: 6px; color: var(--vs-text); font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
      .tpl img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
      .tpl.active { border-color: var(--vs-primary); box-shadow: 0 0 0 2px rgba(124, 92, 255, .35); }
    `,
  ],
})
export class MotionsPage extends ToolBase {
  private readonly media = inject(MediaService);
  readonly list = signal<Asset[]>([]);
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly mode = signal<Mode>('video');
  readonly name = signal('');
  readonly files = signal<PickedMedia[]>([]);
  readonly url = signal('');
  readonly type = signal<MotionType>('render');
  readonly smoothing = signal(false);
  readonly fps = signal('25');
  readonly model = signal<ViggleModel | ''>('');
  readonly text = signal('');
  readonly seconds = signal(5);
  readonly guidance = signal(5);
  readonly smoothText = signal(true);
  readonly templateId = signal('');
  readonly importModel = signal<'V3_Preview' | 'V4_BaseSG'>('V3_Preview');
  readonly templates = signal<MotionTemplate[]>([]);
  readonly loadingTemplates = signal(false);
  readonly templatesError = signal('');
  readonly modelOptions = [{ value: '', label: 'Default' }, ...VIGGLE_MODELS.map((m) => ({ value: m, label: m }))];
  readonly importModels = [{ value: 'V3_Preview', label: 'V3' }, { value: 'V4_BaseSG', label: 'V4' }];

  readonly cost = computed(() => {
    switch (this.mode()) {
      case 'text':
        return TEXT_TO_MOTION_CREDITS;
      case 'import':
        return 1;
      default:
        return motionCredits(this.type(), this.files()[0]?.durationS ?? 5);
    }
  });

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.list.set((await this.api.listMotions()).data);
    } catch (e) {
      await this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(ev: CustomEvent): Promise<void> {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  tplId(t: MotionTemplate): string {
    return String(t.template_id ?? t.id ?? t.uuid ?? '');
  }

  async loadTemplates(): Promise<void> {
    this.loadingTemplates.set(true);
    this.templatesError.set('');
    try {
      const raw = await this.api.listMotionTemplates();
      const list = ApiService.templatesFrom(raw);
      this.templates.set(list);
      if (!list.length) this.templatesError.set('No templates returned. Paste a template id from the Viggle app instead.');
    } catch (e) {
      this.templatesError.set(`Template browsing unavailable (${(e as Error).message}). Paste a template id instead.`);
    } finally {
      this.loadingTemplates.set(false);
    }
  }

  valid(): boolean {
    switch (this.mode()) {
      case 'text':
        return this.text().trim().length > 0;
      case 'import':
        return this.templateId().trim().length > 0;
      default:
        return this.files().length > 0 || !!this.url().trim();
    }
  }

  async create(): Promise<void> {
    const name = this.name().trim();
    let work: () => Promise<Asset>;
    let tool = 'Motion';
    if (this.mode() === 'text') {
      tool = 'Text to Motion';
      work = () => this.api.createMotionFromText({ text: this.text().trim(), duration_seconds: this.seconds(), guidance_scale: this.guidance(), smooth: this.smoothText(), name });
    } else if (this.mode() === 'import') {
      tool = 'Import Motion';
      work = () => this.api.importMotion({ template_id: this.templateId().trim(), name: name || undefined, model: this.importModel() });
    } else {
      const fields: FormInput = { name, type: this.type() };
      if (this.files()[0]) fields['motion_video'] = this.files()[0].file;
      else fields['motion_video_url'] = this.url().trim();
      if (this.model()) fields['model'] = this.model();
      if (this.type() !== 'render') {
        fields['enable_smoothing'] = this.smoothing();
        if (this.fps().trim()) fields['target_fps'] = Number(this.fps());
      }
      work = () => this.api.createMotion(fields);
    }
    const job = await this.run(work, { kind: 'motion', tool, title: name || this.text().trim() || this.templateId() || 'New motion', estimatedCredits: this.cost() }, false);
    if (job) {
      this.showForm.set(false);
      this.files.set([]);
      this.name.set('');
      await this.load();
    }
  }

  async exportMotion(m: Asset, type: 'glb' | 'fbx'): Promise<void> {
    try {
      const r = await this.api.exportMotion(m.id, type);
      const url = r.mixamo_url ?? r.metahuman_url ?? r.metahuman_body_url;
      if (!url) return void (await this.toast.show(`Export ${r.status}. ${r.error?.message ?? 'Try again shortly.'}`, 'warning'));
      await this.media.saveAndShare(url, `${m.name || m.id}-mixamo.${type}`);
      if (r.metahuman_url) await this.toast.show('MetaHuman rigs are also available (metahuman_url / metahuman_body_url).', 'medium', 4000);
    } catch (e) {
      await this.toast.error(e);
    }
  }

  async copy(id: string): Promise<void> {
    await navigator.clipboard?.writeText(id);
    await this.toast.success('Copied');
  }

  async remove(m: Asset): Promise<void> {
    if (!(await this.toast.confirm('Delete motion?', `${m.name || m.id} will be deleted from your Viggle account.`))) return;
    try {
      await this.api.deleteMotion(m.id);
      this.list.update((l) => l.filter((x) => x.id !== m.id));
      this.jobs.remove(m.id);
    } catch (e) {
      await this.toast.error(e);
    }
  }
}
