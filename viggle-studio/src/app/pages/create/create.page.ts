import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header.component';

interface Tool {
  title: string;
  desc: string;
  icon: string;
  link: string;
  price: string;
  tint: string;
}
interface Group {
  name: string;
  tools: Tool[];
}

@Component({
  selector: 'app-create',
  imports: [RouterLink, IonContent, IonIcon, PageHeaderComponent],
  template: `
    <vs-page-header title="Create"></vs-page-header>
    <ion-content>
      @for (g of groups; track g.name) {
        <div class="vs-section">
          <div class="vs-section-title">{{ g.name }}</div>
          <div class="vs-stack">
            @for (t of g.tools; track t.link) {
              <a class="tool" [routerLink]="t.link" [style.--tint]="t.tint">
                <div class="ico"><ion-icon [name]="t.icon"></ion-icon></div>
                <div class="body">
                  <div class="title">{{ t.title }}</div>
                  <div class="desc">{{ t.desc }}</div>
                </div>
                <div class="right">
                  <span class="price">{{ t.price }}</span>
                  <ion-icon name="chevron-forward"></ion-icon>
                </div>
              </a>
            }
          </div>
        </div>
      }
      <div style="height: 24px"></div>
    </ion-content>
  `,
  styles: [
    `
      .tool { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; background: var(--vs-surface); border: 1px solid var(--vs-border); text-decoration: none; color: inherit; }
      .ico { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--tint) 18%, transparent); color: var(--tint); font-size: 22px; flex: 0 0 auto; }
      .body { flex: 1; min-width: 0; }
      .title { font-weight: 800; font-size: 15px; }
      .desc { font-size: 12px; color: var(--vs-muted); margin-top: 2px; line-height: 1.35; }
      .right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; color: var(--vs-muted); }
      .price { font-size: 11px; font-weight: 700; color: var(--vs-secondary); white-space: nowrap; }
    `,
  ],
})
export class CreatePage {
  readonly groups: Group[] = [
    {
      name: 'Video generation (H3)',
      tools: [
        { title: 'Text to Video', desc: 'Describe a shot. 5–15 s, up to 4K, native audio.', icon: 'text', link: '/tool/text-to-video', price: '1 cr/s', tint: '#7c5cff' },
        { title: 'Image to Video', desc: 'Animate from a first frame, or interpolate first → last frame.', icon: 'image', link: '/tool/image-to-video', price: '1 cr/s', tint: '#22d3ee' },
        { title: 'Reference to Video', desc: 'Guide style and subjects with up to 4 images and a reference clip.', icon: 'layers', link: '/tool/reference-to-video', price: '1 cr/s', tint: '#a855f7' },
        { title: 'Upscale 2×', desc: 'FlashVSR super-resolution for any clip (480p → 1080p, 768p → 2K).', icon: 'expand', link: '/tool/upscale', price: '1 cr/s', tint: '#4ade80' },
      ],
    },
    {
      name: 'Character animation',
      tools: [
        { title: 'Viggle Animate', desc: 'Drive one or more character images with a dance / action video.', icon: 'body', link: '/tool/animate', price: '1 cr/s', tint: '#fbbf24' },
        { title: 'Video Remix', desc: 'Classic Viggle mix: character image + motion video, green screen or transparent.', icon: 'swap-horizontal', link: '/tool/remix', price: '1 cr/s', tint: '#f472b6' },
      ],
    },
    {
      name: 'Images',
      tools: [
        { title: 'Viggle Image', desc: 'Generate 1–6 PNGs at 1K or 2K with up to 8 reference images.', icon: 'color-palette', link: '/tool/image', price: '1–2 cr', tint: '#22d3ee' },
      ],
    },
    {
      name: 'Reusable assets',
      tools: [
        { title: 'Characters', desc: 'Save characters once, reuse in every remix. Optional 3D Gaussian splat export.', icon: 'person', link: '/tool/characters', price: '1–31 cr', tint: '#7c5cff' },
        { title: 'Motions', desc: 'Capture motion from video, generate from text, or import official templates. GLB/FBX export.', icon: 'film', link: '/tool/motions', price: '0–10 cr', tint: '#a855f7' },
      ],
    },
    {
      name: '3D',
      tools: [
        { title: 'Scene Model', desc: 'Build a 3D scene from a prompt or 360° panorama and render new camera views.', icon: 'cube', link: '/tool/scene', price: '6 cr', tint: '#4ade80' },
      ],
    },
    {
      name: 'Stories',
      tools: [
        { title: 'Story Studio', desc: 'Turn an idea into a multi-scene short film with keyframes, clips and auto-stitching.', icon: 'book', link: '/story/new', price: 'per scene', tint: '#f472b6' },
      ],
    },
  ];
}
