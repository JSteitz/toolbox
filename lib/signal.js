/**
 * @typedef {object} Context
 * @property {CallableFunction} execute
 * @property {Disposer} dispose
 * @property {Set<Context>[]} dependencies
 * @property {Context[]} subscriptions
 * @property {CallableFunction[]} disposables
 */

/**
 * @template T
 * @callback Accessor
 * @returns {T | undefined}
 */

/**
 * @template T
 * @callback Setter
 * @param {T | ((pref?: T) => T)} [value]
 * @returns {void}
 */

/**
 * @callback Disposer
 * @returns {void}
 */

/**
 * @template T
 * @typedef {[Accessor<T>, Setter<T>]} Reactive
 */

/**
 * @template T
 * @typedef {[Accessor<T>, Disposer]} Computed
 */

/** @type {Context[]} */
const stack = [];

/**
 * @returns {Context | undefined}
 */
function getCurrentContext() {
  return stack[stack.length - 1];
}

/**
 * @param {Context} context
 */
function startTracking(context) {
  stack.push(context);
}

function stopTracking() {
  stack.pop();
}

/**
 * @template [T=undefined]
 * @param {T} [value]
 * @returns {Reactive<T>}
 */
export function signal(value) {
  /** @type {Set<Context>} */
  const subscriptions = new Set();
  let data = value;

  return [
    function read() {
      const context = getCurrentContext();

      if (context !== undefined) {
        subscriptions.add(context);
        context.dependencies.push(subscriptions);
      }

      return data;
    },
    function write(value) {
      const nextValue = value instanceof Function ? value(data) : value;

      if (nextValue !== data) {
        data = nextValue;

        // shallow copy required to prevent infinite recurssion
        [...subscriptions].forEach(({ execute }) => execute());
      }
    }
  ];
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {Accessor<T>}
 */
export function computed(fn) {
  const [read, write] = /** @type {Reactive<T>} */(signal());
  effect(() => write(fn()));

  return read;
}

/**
 * @param {(value: Disposer) => CallableFunction | void} fn
 * @returns {void}
 */
export function effect(fn) {
  /** @type {Context} */
  const context = { execute, dispose, dependencies: [], subscriptions: [], disposables: [] };
  const parentContext = getCurrentContext();

  function execute() {
    try {
      dispose();

      if (parentContext !== undefined) {
        parentContext.subscriptions.push(context);
      }

      startTracking(context);
      context.disposables.push(fn(dispose) ?? (() => { }));
    } finally {
      stopTracking();
    }
  }

  function dispose() {
    context.dependencies.forEach((dep) => dep.delete(context));
    context.dependencies = [];

    context.subscriptions.forEach(({ dispose }) => dispose());
    context.subscriptions = [];

    context.disposables.forEach((fn) => fn());
    context.disposables = [];
  }

  execute();
}
