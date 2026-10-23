import { Component, input, model } from '@angular/core';

export interface ChipOption<T extends string | number | boolean = string> {
  value: T;
  label: string;
  hint?: string;
}

/** Horizontal, scrollable single-select chip row used for every enum option in the app. */
@Component({
  selector: 'vs-option-chips',
  template: `
    <div class="chips" role="radiogroup" [attr.aria-label]="label()">
      @for (o of options(); track o.value) {
        <button
          type="button"
          class="chip"
          role="radio"
          [class.active]="o.value === value()"
          [attr.aria-checked]="o.value === value()"
          (click)="value.set(o.value)"
        >
          <span class="chip-label">{{ o.label }}</span>
          @if (o.hint) {
            <span class="chip-hint">{{ o.hint }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 6px; scrollbar-width: none; }
      .chips::-webkit-scrollbar { display: none; }
      .chip {
        flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1px;
        padding: 8px 14px; border-radius: 999px; border: 1px solid var(--vs-border);
        background: var(--vs-surface-2); color: var(--vs-text); font: inherit; font-size: 13px; font-weight: 600;
        transition: all .15s ease; cursor: pointer; min-height: 38px;
      }
      .chip.active { background: var(--vs-accent-gradient); border-color: transparent; color: #fff; box-shadow: 0 6px 18px -8px var(--vs-primary); }
      .chip-hint { font-size: 10px; font-weight: 500; opacity: .75; }
    `,
  ],
})
export class OptionChipsComponent<T extends string | number | boolean = string> {
  readonly options = input.required<ChipOption<T>[]>();
  readonly label = input<string>('');
  readonly value = model<T>();
}
