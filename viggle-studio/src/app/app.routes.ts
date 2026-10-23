import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
      { path: 'create', loadComponent: () => import('./pages/create/create.page').then((m) => m.CreatePage) },
      { path: 'story', loadComponent: () => import('./pages/story/story-list.page').then((m) => m.StoryListPage) },
      { path: 'library', loadComponent: () => import('./pages/library/library.page').then((m) => m.LibraryPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'tool/text-to-video', loadComponent: () => import('./pages/tools/text-to-video.page').then((m) => m.TextToVideoPage) },
  { path: 'tool/image-to-video', loadComponent: () => import('./pages/tools/image-to-video.page').then((m) => m.ImageToVideoPage) },
  { path: 'tool/reference-to-video', loadComponent: () => import('./pages/tools/reference-to-video.page').then((m) => m.ReferenceToVideoPage) },
  { path: 'tool/animate', loadComponent: () => import('./pages/tools/animate.page').then((m) => m.AnimatePage) },
  { path: 'tool/remix', loadComponent: () => import('./pages/tools/remix.page').then((m) => m.RemixPage) },
  { path: 'tool/upscale', loadComponent: () => import('./pages/tools/upscale.page').then((m) => m.UpscalePage) },
  { path: 'tool/image', loadComponent: () => import('./pages/tools/image-gen.page').then((m) => m.ImageGenPage) },
  { path: 'tool/characters', loadComponent: () => import('./pages/assets/characters.page').then((m) => m.CharactersPage) },
  { path: 'tool/motions', loadComponent: () => import('./pages/assets/motions.page').then((m) => m.MotionsPage) },
  { path: 'tool/scene', loadComponent: () => import('./pages/tools/scene.page').then((m) => m.ScenePage) },
  { path: 'story/new', loadComponent: () => import('./pages/story/story-new.page').then((m) => m.StoryNewPage) },
  { path: 'story/:id', loadComponent: () => import('./pages/story/story-detail.page').then((m) => m.StoryDetailPage) },
  { path: 'job/:id', loadComponent: () => import('./pages/job/job.page').then((m) => m.JobPage) },
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/home' },
];
