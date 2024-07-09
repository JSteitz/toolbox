import { effect } from './signal.js';

/**
 * @callback AttributeGetter
 * @param {string|null} newValue
 * @param {string|null} [oldValue]
 * @returns {void}
 */

/**
 * @callback AttributeSetter
 * @returns {string|null}
 */

/**
 * @callback PropertyGetter
 * @returns {unknown}
 */

/**
 * @callback PropertySetter
 * @param {unknown} value
 * @returns {void}
 */

/**
 * @callback CreatedCallbackHandler
 * @returns {void}
 */

/**
 * @callback ConnectedCallbackHandler
 * @returns {void}
 */

/**
 * @callback DisconnectedCallbackHandler
 * @returns {void}
 */

/**
 * @callback AdaptedCallbackHandler
 * @returns {void}
 */

/**
 * @callback AttributeChangedCallbackHandler
 * @param {string} name
 * @param {string|null} oldValue
 * @param {string|null} newValue
 * @returns {void}
 */

/**
 * @callback FormAssociatedCallbackHandler
 * @param {HTMLFormElement} form
 * @returns {void}
 */

/**
 * @callback FormDisabledCallbackHandler
 * @param {boolean} disabled
 * @returns {void}
 */

/**
 * @callback FormResetCallbackHandler
 * @returns {void}
 */

/**
 * @callback FormStateRestoreCallbackHandler
 * @param {unknown} state
 * @param {"autocomplete"|"restore"} mode
 * @returns {void}
 */

/**
 * @callback DefineAttribute
 * @param {string} name
 * @param {AttributeGetter} getter
 * @param {AttributeSetter} [setter]
 * @returns {void}
 */

/**
 * @callback DefineProperty
 * @param {string} name
 * @param {PropertyGetter} getter
 * @param {PropertySetter} [setter]
 * @returns {void}
 */

/**
 * @typedef {object} Context
 * @property {HTMLElement} [root]
 * @property {ShadowRoot} [shadow]
 * @property {ElementInternals} [internals]
 * @property {(handler: CreatedCallbackHandler) => void} onCreated
 * @property {(handler: ConnectedCallbackHandler) => void} onConnected
 * @property {(handler: DisconnectedCallbackHandler) => void} onDisconnected
 * @property {(handler: AdaptedCallbackHandler) => void} onAdapted
 * @property {(handler: AttributeChangedCallbackHandler) => void} onAttributeChanged
 * @property {(handler: FormAssociatedCallbackHandler) => void} onFormAssociated
 * @property {(handler: FormDisabledCallbackHandler) => void} onFormDisabled
 * @property {(handler: FormResetCallbackHandler) => void} onFormReset
 * @property {(handler: FormStateRestoreCallbackHandler) => void} onFormStateRestore
 * @property {DefineAttribute} defineAttribute
 * @property {DefineProperty} defineProperty
 */

/**
 * @template T extends HTMLElement
 * @param {(context: Context) => DocumentFragment|Element|Node} setup
 * @returns {T}
 */
export function component(setup, options = { formAssociated: false }) {
  /** @type {Map<string, { getter: AttributeGetter, setter?: AttributeSetter }>} */
  const attributes = new Map();

  /** @type {Map<string, { getter: PropertyGetter, setter?: PropertySetter }>} */
  const properties = new Map();

  let initialized = false;

  /** @type {HTMLElement|undefined} */
  let root = undefined;

  /** @type {ElementInternals|undefined} */
  let internals = undefined;

  /** @type {ShadowRoot|undefined} */
  let shadow = undefined;

  /** @type {CreatedCallbackHandler|undefined} */
  let createdCallbackHandler = undefined;

  /** @type {ConnectedCallbackHandler|undefined} */
  let connectedCallbackHandler = undefined;

  /** @type {DisconnectedCallbackHandler|undefined} */
  let disconnectedCallbackHandler = undefined;

  /** @type {AdaptedCallbackHandler|undefined} */
  let adaptedCallbackHandler = undefined;

  /** @type {AttributeChangedCallbackHandler|undefined} */
  let attributeChangedCallbackHandler = undefined;

  /** @type {FormAssociatedCallbackHandler|undefined} */
  let formAssociatedCallbackHandler = undefined;

  /** @type {FormDisabledCallbackHandler|undefined} */
  let formDisabledCallbackHandler = undefined;

  /** @type {FormResetCallbackHandler|undefined} */
  let formResetCallbackHandler = undefined;

  /** @type {FormStateRestoreCallbackHandler|undefined} */
  let formStateRestoreCallbackHandler = undefined;

  /** @type {Context} */
  const context = {
    get root() {
      return root;
    },

    get shadow() {
      return shadow;
    },

    get internals() {
      return internals;
    },

    onCreated: (handler) => {
      createdCallbackHandler = handler;
    },

    onConnected: (handler) => {
      connectedCallbackHandler = handler;
    },

    onDisconnected: (handler) => {
      disconnectedCallbackHandler = handler;
    },

    onAdapted: (handler) => {
      adaptedCallbackHandler = handler;
    },

    onAttributeChanged: (handler) => {
      attributeChangedCallbackHandler = handler;
    },

    onFormAssociated: (handler) => {
      formAssociatedCallbackHandler = handler;
    },

    onFormDisabled: (handler) => {
      formDisabledCallbackHandler = handler;
    },

    onFormReset: (handler) => {
      formResetCallbackHandler = handler;
    },

    onFormStateRestore: (handler) => {
      formStateRestoreCallbackHandler = handler;
    },

    defineAttribute: (name, getter, setter) => {
      attributes.set(name, { getter, setter });
    },

    defineProperty: (name, getter, setter) => {
      properties.set(name, { getter, setter })
    },
  };

  const template = setup(context);

  return /** @type {T} */ (class extends HTMLElement {
    static observedAttributes = [...attributes.keys()];
    static formAssociated = options.formAssociated;

    constructor() {
      super();

      root = this;
      shadow = this.attachShadow({ mode: 'open' });
      internals = this.attachInternals();

      attributes.forEach(({ setter }, name) => {
        if (setter) {
          effect(() => {
            const value = setter();

            if (initialized) {
              (value === null)
                ? this.removeAttribute(name)
                : this.setAttribute(name, value);
            }
          })
        }
      });

      properties.forEach(({ getter, setter }, name) => {
        Object.defineProperty(root, name, {
          configurable: true,
          enumerable: true,
          get: getter,
          set: setter,
        });
      });

      shadow?.append(template);

      if (createdCallbackHandler) {
        createdCallbackHandler();
      }

      initialized = true;
    }

    /**
    * @returns {void}
    */
    connectedCallback() {
      if (connectedCallbackHandler) {
        connectedCallbackHandler();
      }
    }

    /**
    * @returns {void}
    */
    disconnectedCallback() {
      if (disconnectedCallbackHandler) {
        disconnectedCallbackHandler();
      }
    }

    /**
    * @returns {void}
    */
    adaptedCallback() {
      if (adaptedCallbackHandler) {
        adaptedCallbackHandler();
      }
    }

    /**
    * @param {string} name
    * @param {string} oldValue
    * @param {string} newValue
    * @returns {void}
    */
    attributeChangedCallback(name, oldValue, newValue) {
      attributes.get(name)?.getter(newValue, oldValue);

      if (attributeChangedCallbackHandler) {
        attributeChangedCallbackHandler(name, oldValue, newValue);
      }
    }

    // from here life-cycle hooks for form-associated elements

    /**
    * @param {HTMLFormElement} form
    * @returns {void}
    */
    formAssociatedCallback(form) {
      if (formAssociatedCallbackHandler) {
        formAssociatedCallbackHandler(form);
      }
    }

    /**
    * @param {boolean} disabled
    * @returns {void}
    */
    formDisabledCallback(disabled) {
      if (formDisabledCallbackHandler) {
        formDisabledCallbackHandler(disabled);
      }
    }

    /**
    * @returns {void}
    */
    formResetCallback() {
      if (formResetCallbackHandler) {
        formResetCallbackHandler();
      }
    }

    /**
    * @param {unknown} state
    * @param {"autocomplete"|"restore"} mode
    * @returns {void}
    */
    formStateRestoreCallback(state, mode) {
      if (formStateRestoreCallbackHandler) {
        formStateRestoreCallbackHandler(state, mode);
      }
    }
  });
}
