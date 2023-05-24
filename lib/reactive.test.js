import { test } from '../node_modules/zora/dist/index.js';
import { ref, computed, effect } from '../lib/reactive.js';

test('ref initializes with given value', ({ equal }) => {
  const [getRefValue] = ref('foo');

  equal(getRefValue(), 'foo', 'ref value matches initial value');
});

test('ref can be updated', ({ equal }) => {
  const [getRefValue, updateRefValue] = ref('foo');

  updateRefValue(() => 'foobar');
  equal(getRefValue(), 'foobar', 'ref value updated');
});

test('ref value is immutable', ({ isNot }) => {
  const originalValue = {};
  const [getRefValue, updateRefValue] = ref(originalValue);

  isNot(getRefValue(), originalValue, 'ref differs from original');

  // @ts-ignore no return to test immutability
  updateRefValue((value) => { value.foo = 'bar'; });
  isNot(getRefValue(), originalValue, 'update changes do not modify original');
});

test('computed is lazy', ({ ok }) => {
  let called = false;
  computed(() => { called = true; });

  ok(called, 'computed fn invoked immediatly');
});

test('computed updates with dependencies', ({ equal }) => {
  const [getRefValue, updateRefValue] = ref('foo');
  const [getComputedValue] = computed(() => getRefValue());

  updateRefValue(() => 'bar');
  equal(getComputedValue(), 'bar', 'updating ref also updates computed value');
});

test('reactive values are watchable', ({ equal }) => {
  const [getRefValue, updateRefValue] = ref('foo');
  const [getComputedValue] = computed(() => getRefValue());
  let calledRefWatcher = 0;
  let calledComputedWatcher = 0;
  let calledLazyRefWatcher = 0;
  let calledLazyComputedWatcher = 0;

  effect(() => { getRefValue(); calledRefWatcher++; });
  effect(() => { calledLazyRefWatcher++; }, [getRefValue]);

  effect(() => { getComputedValue(); calledComputedWatcher++; });
  effect(() => { calledLazyComputedWatcher++; }, [getComputedValue]);

  equal(calledRefWatcher, 1, 'effect callback immediatly invoked [ref]');
  equal(calledComputedWatcher, 1, 'effect callback immediatly invoked [computed]');

  updateRefValue(() => 'foobar');

  equal(calledRefWatcher, 2, 'watching ref value');
  equal(calledLazyRefWatcher, 1, 'watching ref value lazy');
  equal(calledComputedWatcher, 2, 'watching computed value');
  equal(calledLazyComputedWatcher, 1, 'watching computed value lazy');
});
