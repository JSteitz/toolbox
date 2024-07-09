import { test } from '../node_modules/zora/dist/index.js';
import { signal } from './signal.js';
import { html } from './html.js';
import { component } from './web.js';

test('component is created', ({ equal, notEqual }) => {
  customElements.define('sw-test-root', component((context) => {
    equal(context.root, undefined);
    equal(context.shadow, undefined);
    equal(context.internals, undefined);

    context.onCreated(() => {
      notEqual(context.root, undefined);
      notEqual(context.shadow, undefined);
      notEqual(context.internals, undefined);
    })

    return html``;
  }));

  document.createElement('sw-test-root');
});

test('component is created as form-associated', ({ equal }) => {
  const element = component(() => html``, { formAssociated: true });

  equal(element.formAssociated, true);
});

test('component is created with observed attributes', ({ equal }) => {
  const element = component((context) => {
    context.defineAttribute('customAttribute', () => {});
    return html``;
  });

  equal(element.observedAttributes, ['customAttribute']);
});

test('component is created with properties', ({ equal }) => {
  customElements.define('sw-test-custom-property', component((context) => {
    context.defineProperty('customProperty', () => true);
    return html``;
  }));

  const element = document.createElement('sw-test-custom-property');
  // TODO: add property name from `defineProperty()` to type
  equal(element.customProperty, true);
});

test('component tracks attribute changes', ({ equal }) => {
  customElements.define('sw-test-attr-track', component((context) => {
    context.defineAttribute('name', (value) => equal(value, 'foobar'));

    return html``;
  }));

  document.createElement('sw-test-attr-track')
    .setAttribute('name', 'foobar');
});
