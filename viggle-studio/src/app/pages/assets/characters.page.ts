import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, IonButton, IonIcon, IonInput, IonToggle, IonItem, IonLabel, IonNote, IonSpinner, IonRefresher, IonRefresherContent } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { MediaPickerComponent } from '../../shared/media-picker.component';
import { OptionChipsComponent } from '../../shared/option-chips.component';
import { SubmitBarComponent } from '../../shared/submit-bar.component';
import { ToolBase } from '../tools/tool-base';
import { MediaService, PickedMedia } from '../../core/media.service';
import { Asset, CharacterType, VIGGLE_MODELS, ViggleModel } from '../../core/models';
import { characterCredits } from '../../core/pricing';
import { FormInput } from '../../core/api.service';

@Component({
  selector: 'app-characters',
  imports: [DatePipe, IonContent, IonButton, IonIcon, IonInput, IonToggle, IonItem, IonLabel, IonNote, IonSpinner, IonRefresher, IonRefresherContent, PageHeaderComponent, MediaPickerComponent, OptionChipsComponent, SubmitBarComponent],
  template: `
    <vs-page-header title="Characters" back="/tabs/create"></vs-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>

      <div class="vs-section" style="margin-top: 4px">
        <div class="vs-section-title">
          Your characters
          <span class="link" (click)="showForm.set(!showForm())">{{ showForm() ? 'Hide form' : '+ New character' }}</span>
        </div>
        @if (loading()) {
          <div class="vs-row" style="justify-content:center;padding:20px"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (!list().length) {
          <div class="vs-empty">
            <ion-icon name="person"></ion-icon>
            <h3>No characters yet</h3>
            <p>Create a character from a photo once and reuse it in every Video Remix.</p>
          </div>
        } @else {
          <div class="vs-stack">
            @for (c of list(); track c.id) {
              <div class="vs-card asset">
                <div class="vs-row">
                  <div style="min-width:0">
                    <div class="name">{{ c.name || 'Untitled' }}</div>
                    <div class="id">{{ c.id }} · {{ c.type }} · {{ c.created_at | date: 'MMM d' }}</div>
                  </div>
                  <span class="vs-pill" [class.ok]="c.status === 'ready'" [class.bad]="c.status === 'failed'" [class.busy]="c.status === 'queued' || c.status === 'processing'">{{ c.status }}</span>
                </div>
                @if (c.vsplat) {
                  <div class="vs-help">3D extraction: {{ c.vsplat.status }}{{ c.vsplat.error ? ' — ' + c.vsplat.error.message : '' }}</div>
                }
                <div class="actions">
                  @if (c.status === 'ready' && (c.type === 'vsplat' || c.type === 'all')) {
                    <ion-button size="small" fill="outline" (click)="exportVsplat(c)"><ion-icon slot="start" name="download"></ion-icon>.vsplat</ion-button>
                  }
                  <ion-button size="small" fill="outline" (click)="copy(c.id)"><ion-icon slot="start" name="copy"></ion-icon>Copy ID</ion-button>
                  <ion-button size="small" fill="clear" color="danger" (click)="remove(c)"><ion-icon slot="icon-only" name="trash"></ion-icon></ion-button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (showForm()) {
        <div class="vs-section">
          <div class="vs-section-title">New character</div>
          <div class="vs-stack">
            <vs-media-picker title="Source image" hint="PNG, JPEG or WebP of one person, full body preferred." kind="image" [(files)]="files" [(url)]="url"></vs-media-picker>
            <ion-input label="Name" labelPlacement="stacked" fill="outline" [value]="name()" (ionInput)="name.set($any($event).detail.value ?? '')" placeholder="e.g. Red jacket Mia"></ion-input>
            <div class="vs-field">
              <div class="vs-label">Type</div>
              <vs-option-chips [options]="typeOptions" [value]="type()" (valueChange)="type.set($any($event))"></vs-option-chips>
              <p class="vs-help">
                @switch (type()) {
                  @case ('render') { 2D character for Video Remix. 1 credit. }
                  @case ('vsplat') { 3D Gaussian-splat character for game engines (Unity plugin). 30 credits, 25 without enhance. }
                  @case ('all') { Both the 2D render asset and the 3D vsplat. 31 / 26 credits. }
                }
              </p>
            </div>
            @if (type() !== 'render') {
              <ion-item lines="none">
                <ion-toggle [checked]="enhance()" (ionChange)="enhance.set($any($event).detail.checked)">
                  <ion-label>Enhanced extraction</ion-label>
                  <ion-note>+5 credits, higher quality splats</ion-note>
                </ion-toggle>
              </ion-item>
              <details class="vs-advanced">
                <summary>3D options</summary>
                <div class="vs-stack">
                  <div class="vs-field">
                    <div class="vs-label">Joint set</div>
                    <vs-option-chips [options]="[{ value: 'body', label: 'Body', hint: '86 joints' }, { value: 'full', label: 'Full', hint: '441 joints' }, { value: 'expression', label: 'Expression', hint: '119' }]"
                      [value]="jointSet()" (valueChange)="jointSet.set($any($event))"></vs-option-chips>
                  </div>
                  <div class="vs-field">
                    <div class="vs-label">Prune preset</div>
                    <vs-option-chips [options]="pruneOptions" [value]="prune()" (valueChange)="prune.set($any($event))"></vs-option-chips>
                  </div>
                  <ion-input label="Quality (0–1, kept splats)" labelPlacement="stacked" fill="outline" type="number" step="0.05" [value]="quality()" (ionInput)="quality.set($any($event).detail.value ?? '')"></ion-input>
                  <ion-item lines="none">
                    <ion-toggle [checked]="thumb()" (ionChange)="thumb.set($any($event).detail.checked)"><ion-label>Render preview thumbnail</ion-label></ion-toggle>
                  </ion-item>
                </div>
              </details>
            }
            <details class="vs-advanced">
              <summary>Model</summary>
              <vs-option-chips [options]="modelOptions" [value]="model()" (valueChange)="model.set($any($event))"></vs-option-chips>
            </details>
          </div>
        </div>
      }
      <div style="height: 16px"></div>
    </ion-content>
    @if (showForm()) {
      <vs-submit-bar [credits]="cost()" label="Create character" [disabled]="!valid()" [busy]="busy()" (action)="create()"></vs-submit-bar>
    }
  `,
  styles: [
    `
      .name { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .id { font-size: 11px; color: var(--vs-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
    `,
  ],
})
export class CharactersPage extends ToolBase {
  private readonly media = inject(MediaService);
  readonly list = signal<Asset[]>([]);
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly files = signal<PickedMedia[]>([]);
  readonly url = signal('');
  readonly name = signal('');
  readonly type = signal<CharacterType>('render');
  readonly enhance = signal(true);
  readonly jointSet = signal<'body' | 'full' | 'expression'>('body');
  readonly prune = signal('balanced');
  readonly quality = signal('0.7');
  readonly thumb = signal(false);
  readonly model = signal<ViggleModel | ''>('');
  readonly typeOptions = [
    { value: 'render', label: '2D render', hint: '1 cr' },
    { value: 'vsplat', label: '3D vsplat', hint: '25–30 cr' },
    { value: 'all', label: 'Both', hint: '26–31 cr' },
  ];
  readonly pruneOptions = ['geometric', 'draft', 'balanced', 'quality', 'compact', 'compact_hq'].map((p) => ({ value: p, label: p }));
  readonly modelOptions = [{ value: '', label: 'Default' }, ...VIGGLE_MODELS.map((m) => ({ value: m, label: m }))];
  readonly cost = computed(() => characterCredits(this.type(), this.enhance()));

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.list.set((await this.api.listCharacters()).data);
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

  valid(): boolean {
    return this.files().length > 0 || !!this.url().trim();
  }

  async create(): Promise<void> {
    const fields: FormInput = { name: this.name().trim(), type: this.type() };
    if (this.files()[0]) fields['image'] = this.files()[0].file;
    else fields['image_url'] = this.url().trim();
    if (this.model()) fields['model'] = this.model();
    if (this.type() !== 'render') {
      fields['enhance'] = this.enhance();
      fields['joint_set'] = this.jointSet();
      fields['prune_preset'] = this.prune();
      if (this.quality().trim()) fields['quality'] = Number(this.quality());
      fields['render_thumbnail'] = this.thumb();
    }
    const job = await this.run(() => this.api.createCharacter(fields), {
      kind: 'character',
      tool: 'Character',
      title: this.name().trim() || 'New character',
      estimatedCredits: this.cost(),
      thumbnail: this.files()[0]?.previewUrl ?? null,
    }, false);
    if (job) {
      this.showForm.set(false);
      this.files.set([]);
      this.name.set('');
      await this.load();
    }
  }

  async exportVsplat(c: Asset): Promise<void> {
    try {
      const r = await this.api.exportCharacter(c.id, 'vsplat');
      if (r.vsplat_url) await this.media.saveAndShare(r.vsplat_url, `${c.name || c.id}.vsplat`);
      else await this.toast.show(`Export ${r.status}. ${r.error?.message ?? 'Try again shortly.'}`, 'warning');
    } catch (e) {
      await this.toast.error(e);
    }
  }

  async copy(id: string): Promise<void> {
    await navigator.clipboard?.writeText(id);
    await this.toast.success('Copied');
  }

  async remove(c: Asset): Promise<void> {
    if (!(await this.toast.confirm('Delete character?', `${c.name || c.id} will be deleted from your Viggle account.`))) return;
    try {
      await this.api.deleteCharacter(c.id);
      this.list.update((l) => l.filter((x) => x.id !== c.id));
      this.jobs.remove(c.id);
    } catch (e) {
      await this.toast.error(e);
    }
  }
}
