/** @type {Set<object>[]} */
const tracklist = [];

/** @type {WeakMap<object, Set<CallableFunction>>} */
const watchlist = new WeakMap();


/**
 * @template {string} T
 * @typedef {object} Tracker
 * @property {(target: T) => void} track
 * @property {() => void} startTracking
 * @property {() => Set<T>} stopTracking
 */

/**
 * @template T
 * @returns {Tracker<T>}
 */
function useTracker() {
  return {
    track(target) {
      tracklist[tracklist.length - 1]?.add(target);
    },
    startTracking() {
      tracklist.push(new Set());
    },
    stopTracking() {
      return tracklist.pop() || new Set();
    },
  };
}

/**
 * @template T
 * @typedef {object} Watcher
 * @property {(target: T, fn: CallableFunction) => CallableFunction} watch
 * @property {(target: T, value: any) => void} dispatch
 */

/**
 * @template T
 * @returns {Watcher<T>}
 */
function useWatcher() {
  return {
    watch(target, fn) {
      const callbacks = watchlist.get(target) ?? new Set();

      callbacks.add(fn);
      watchlist.set(target, callbacks);

      return () => callbacks.delete(fn);
    },
    dispatch(target, value) {
      if (watchlist.has(target)) {
        // shallow copy required to prevent infinite recurssion
        [...watchlist.get(target)].forEach(fn => fn(value));
      }
    },
  };
}

/**
 * @template T
 * @callback ReactiveGetter
 * @returns {T}
 */

/**
 * @template T
 * @callback ReactiveSetter
 * @param {(value: T) => T} fn
 * @returns {void}
 */

/**
 * @template T
 * @param {T} value
 * @returns {[ReactiveGetter<T>, ReactiveSetter<T>]}
 */
export function ref(value) {
  const { track } = useTracker();
  const { dispatch } = useWatcher();
  let data = structuredClone(value instanceof Function ? value() : value);

  function getter() {
    track(getter);
    return data;
  }

  /**
   * @param {(value: T) => T} fn
   */
  function setter(fn) {
    data = fn(structuredClone(data));
    dispatch(getter, data);
  }

  return [getter, setter];
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {[ReactiveGetter<T>, CallableFunction]}
 */
export function computed(fn) {
  const [getter, setter] = ref(undefined);
  const { startTracking, stopTracking } = useTracker();
  const { watch } = useWatcher();
  let deps = new Set();

  function update() {
    clear();
    startTracking();
    setter(() => fn());
    stopTracking().forEach((dep) => {
      deps.add(watch(dep, update));
    });
  }

  function clear() {
    deps.forEach(fn => fn());
    deps.clear();
  }

  update();

  return [getter, clear];
}

/**
 * @param {CallableFunction} fn
 * @param {ReactiveGetter<any>[]} [refs]
 * @returns {CallableFunction}
 */
export function effect(fn, refs) {
  const { startTracking, stopTracking } = useTracker();
  const { watch } = useWatcher();
  let deps = new Set();

  function effect() {
    clear();
    startTracking();
    fn();
    stopTracking().forEach((dep) => {
      deps.add(watch(dep, effect));
    });
  }

  function lazy() {
    refs.forEach((dep) => {
      deps.add(watch(dep, fn));
    });
  }

  function clear() {
    deps.forEach(fn => fn());
    deps.clear();
  }

  if (refs !== undefined && refs.length > 0) {
    lazy();
  } else {
    effect();
  }

  return clear;
}
