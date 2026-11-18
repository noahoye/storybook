// @vitest-environment happy-dom
// Reproduction: an aliased @Output whose story arg is keyed by the property name
// (how Storybook keys output args and actions) replaces the EventEmitter.
import type { Type } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ICollection } from '../types.ts';
import { getApplication } from './StorybookModule.ts';
import { storyPropsProvider } from './StorybookProvider.ts';
import { PropertyExtractor } from './utils/PropertyExtractor.ts';

@Component({ selector: 'foo', template: `<p id="emit" (click)="myClick.emit('hi')"></p>` })
class AliasedOutputComponent {
  @Output('my-click') public myClick = new EventEmitter<string>();
}

const renderAndClick = async (props: ICollection) => {
  const analyzedMetadata = new PropertyExtractor({}, AliasedOutputComponent);
  await analyzedMetadata.init();
  const application = getApplication({
    storyFnAngular: { props },
    component: AliasedOutputComponent,
    targetSelector: 'my-selector',
    analyzedMetadata,
  });
  await TestBed.configureTestingModule({
    imports: [application],
    providers: [storyPropsProvider(new BehaviorSubject<ICollection | undefined>(props))],
  }).compileComponents();
  const fixture = TestBed.createComponent(application as Type<unknown>);
  fixture.detectChanges();
  fixture.nativeElement.querySelector('p#emit').click();
};

describe('aliased output', () => {
  it('calls the handler when the arg is keyed by the alias (passes)', async () => {
    const handler = vi.fn();
    await renderAndClick({ 'my-click': handler });
    expect(handler).toHaveBeenCalledWith('hi');
  });

  it('calls the handler when the arg is keyed by the property name (fails)', async () => {
    // Fails on next: the arg is Object.assign-ed onto the instance, replacing the
    // EventEmitter, so the click logs "TypeError: ctx.myClick.emit is not a function".
    const handler = vi.fn();
    await renderAndClick({ myClick: handler });
    expect(handler).toHaveBeenCalledWith('hi');
  });
});
