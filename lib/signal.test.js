import { test } from '../node_modules/zora/dist/index.js';
import { signal, computed, effect } from './signal.js';

test('initialize signal with value', ({ equal }) => {
  const [value] = signal('foo');

  equal(value(), 'foo');
});

test('change signal value', ({ equal }) => {
  const [value, setValue] = signal('foo');

  setValue('foobar');
  equal(value(), 'foobar');
});

test('computed updates with dependencies', ({ equal }) => {
  const [value, setValue] = signal('foo');
  const computedValue = computed(() => value());

  setValue('bar');
  equal(computedValue(), 'bar');
});

test('effects run immediatly', ({ equal }) => {
  let effectCalls = 0;

  effect(() => { effectCalls++; });
  equal(effectCalls, 1);
});

test('effects react to signal changes', ({ equal }) => {
  const [value, setValue] = signal(0);
  let effectCalls = 0;

  effect(() => {
    effectCalls++;
    value();
  });

  equal(effectCalls, 1);
  setValue(1);
  equal(effectCalls, 2);
});

test('effects react to shared signal changes', ({ equal }) => {
  const [value, setValue] = signal(0);
  let firstEffectCalls = 0;
  let secondEffectCalls = 0;

  effect(() => {
    firstEffectCalls++;
    value();
  });

  effect(() => {
    secondEffectCalls++;
    value();
  });

  equal(firstEffectCalls, secondEffectCalls);
  setValue(1);
  equal(firstEffectCalls, secondEffectCalls);
});

test('effects can be nested', ({ equal }) => {
  const [value, setValue] = signal(0);
  let outerEffectCalls = 0;
  let innerEffectCalls = 0;

  effect(() => {
    outerEffectCalls += 1;
    value();

    effect(() => {
      innerEffectCalls += 1;
    });
  });

  equal(outerEffectCalls, 1);
  equal(innerEffectCalls, 1);
  setValue(1);
  equal(outerEffectCalls, 2);
  equal(innerEffectCalls, 2);
});

test('nested effects auto dispose', ({ equal }) => {
  const [value, setValue] = signal(0);
  let outerEffectCalls = 0;
  let innerEffectCalls = 0;

  effect(() => {
    outerEffectCalls++;
    value();

    effect(() => {
      innerEffectCalls++;
      return () => innerEffectCalls = 0;
    });
  });

  equal(outerEffectCalls, 1);
  equal(innerEffectCalls, 1);
  setValue(1);
  equal(outerEffectCalls, 2);
  equal(innerEffectCalls, 1);
});

test('nested effects react to signal changes independent of parent', ({ equal }) => {
  const [value, setValue] = signal(0);
  let outerEffectCalls = 0;
  let innerEffectCalls = 0;

  effect(() => {
    outerEffectCalls++;

    effect(() => {
      innerEffectCalls++;
      value();
    })
  })

  equal(outerEffectCalls, 1);
  equal(innerEffectCalls, 1);
  setValue(1);
  equal(outerEffectCalls, 1);
  equal(innerEffectCalls, 2);
})
