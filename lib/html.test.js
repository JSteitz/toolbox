import { test } from '../node_modules/zora/dist/index.js';
import { signal } from './signal.js';
import { html } from './html.js';

/**
  * @param {DocumentFragment} value
  * @returns {string}
  */
function serialize(value) {
  return new XMLSerializer()
    .serializeToString(value)
    .replace(' xmlns="http://www.w3.org/1999/xhtml"', '');
}

test('creates template from html string', ({ equal }) => {
  const template = html`<div>foo</div>`;

  equal(serialize(template), '<div>foo</div>');
});

test('renders static text', ({ equal }) => {
  const value = 'foobar';
  const template = html`<div>${value}</div>`;

  equal(serialize(template), '<div>foobar</div>');
});

test('renders static node', ({ equal }) => {
  const node = document.createTextNode('foobar');
  const template = html`<div>${node}</div>`;

  equal(serialize(template), '<div>foobar</div>');
});

test('renders static element', ({ equal }) => {
  const element = document.createElement('span');
  const template = html`<div>${element}</div>`;

  equal(serialize(template), '<div><span></span></div>');
});

test('renders static fragment', ({ equal }) => {
  const fragment = document.createDocumentFragment();
  const element = document.createElement('span');

  fragment.append(element);

  const template = html`<div>${fragment}</div>`;

  equal(serialize(template), '<div><span></span></div>');
  equal(template.firstChild?.firstChild, element);
});

test('renders static attribute value', ({ equal }) => {
  let value = 'bar';
  const template = html`<div foo=${value}></div>`;

  equal(serialize(template), '<div foo="bar"></div>');
  value = 'should not change';
  equal(serialize(template), '<div foo="bar"></div>');
});

test('renders static optional attribute', ({ equal }) => {
  let optional1 = true;
  let optional2 = false;
  const template1 = html`<div ?foo=${optional1}></div>`;
  const template2 = html`<div ?foo=${optional2}></div>`;

  // truthy test
  equal(serialize(template1), '<div foo=""></div>');
  optional1 = false;
  equal(serialize(template1), '<div foo=""></div>');

  // falsy test
  equal(serialize(template2), '<div></div>');
  optional2 = true;
  equal(serialize(template2), '<div></div>');
});

test('renders static property value', ({ equal }) => {
  let value = 'bar';
  const template = html`<div .foo=${value}></div>`;

  equal(serialize(template), '<div></div>');
  equal(template.firstChild?.foo, 'bar');
  value = 'should not change';
  equal(template.firstChild?.foo, 'bar');
});

test('renders static event', ({ equal }) => {
  const event = () => { calls++; };
  const template = html`<div @click=${event}></div>`;
  let calls = 0;

  equal(serialize(template), '<div></div>');
  equal(calls, 0);
  template.firstChild?.dispatchEvent(new Event('click'));
  equal(calls, 1);
});

test('renders dynamic text', ({ equal }) => {
  const [value, setValue] = signal('foobar');
  const template = html`<div>${value}</div>`;

  equal(serialize(template), '<div>foobar</div>');
  setValue('barfoo');
  equal(serialize(template), '<div>barfoo</div>');
});

test('renders dynamic node', ({ equal }) => {
  const node1 = document.createTextNode('foobar');
  const node2 = document.createTextNode('barfoo');
  const [value, setValue] = signal(node1);
  const template = html`<div>${value}</div>`;

  equal(serialize(template), '<div>foobar</div>');
  equal(template.firstChild?.firstChild, node1);
  setValue(node2);
  equal(serialize(template), '<div>barfoo</div>');
  equal(template.firstChild?.firstChild, node2);
});

test('renders dynamic element', ({ equal }) => {
  const node1 = document.createElement('span');
  const node2 = document.createElement('span');
  const [value, setValue] = signal(node1);
  const template = html`<div>${value}</div>`;

  equal(serialize(template), '<div><span></span></div>');
  equal(template.firstChild?.firstChild, node1);
  setValue(node2);
  equal(serialize(template), '<div><span></span></div>');
  equal(template.firstChild?.firstChild, node2);
});

test('renders dynamic fragment', ({ equal }) => {
  const fragment1 = document.createDocumentFragment();
  const fragment2 = document.createDocumentFragment();
  const element1 = document.createElement('span');
  const element2 = document.createElement('span');

  fragment1.append(element1);
  fragment2.append(element2);

  const [value, setValue] = signal(fragment1);
  const template = html`<div>${value}</div>`;

  equal(serialize(template), '<div><span></span></div>');
  equal(template.firstChild?.firstChild, element1);
  setValue(fragment2);
  equal(serialize(template), '<div><span></span></div>');
  equal(template.firstChild?.firstChild, element2);
});

test('renders dynamic attribute value', ({ equal }) => {
  const [value, setValue] = signal('bar');
  const template = html`<div foo=${value}></div>`;

  equal(serialize(template), '<div foo="bar"></div>');
  setValue('rab');
  equal(serialize(template), '<div foo="rab"></div>');
});

test('renders dynamic optional attribute', ({ equal }) => {
  const [optional, setOptional] = signal(true);
  const template = html`<div ?foo=${optional}></div>`;

  equal(serialize(template), '<div foo=""></div>');
  setOptional(false);
  equal(serialize(template), '<div></div>');
});

test('renders dynamic property value', ({ equal }) => {
  const [value, setValue] = signal('bar');
  const template = html`<div .foo=${value}></div>`;

  equal(serialize(template), '<div></div>');
  equal(template.firstChild?.foo, 'bar');
  setValue('rab');
  equal(template.firstChild?.foo, 'rab');
});
