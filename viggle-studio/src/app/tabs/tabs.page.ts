import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon name="home"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="create">
          <ion-icon name="sparkles"></ion-icon>
          <ion-label>Create</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="story">
          <ion-icon name="book"></ion-icon>
          <ion-label>Stories</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="library">
          <ion-icon name="albums"></ion-icon>
          <ion-label>Library</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings">
          <ion-icon name="settings"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {}
