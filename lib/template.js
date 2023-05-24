import { effect } from "./reactive.js";

const TOKEN_REGEX = /\$\$t\d+\$\$/g;

/**
 * @template L, R
 * @param {L[]} left
 * @param {R[]} right
 * @returns {(L | R)[]}
 */
function zip(left, right) {
  const items = [];
  const len = Math.min(left.length, right.length);
  let i = 0;

  while (i < len) {
    items.push(left[i], right[i]);
    i += 1;
  }

  items.push(left[i]);

  return items;
}

/**
 * Tokenizes all values that will be evaluated later after building the dom tree
 *
 * @param {array} items
 * @returns {[string[], Record<string, Function>]}
 */
function tokenize(items) {
  const tokens = /** @type {Record<string, Function>} */({});
  const values = /** @type {string[]} */([]);

  for (let i = 0; i < items.length; i++) {
    const token = `$$t${i}$$`;

    tokens[token] = items[i];
    values.push(items[i] instanceof Function ? token : items[i].toString());
  }

  return [values, tokens];
}

/**
 * @param {Element} node
 * @param {Record<string, Function>} tokens
 */
function processAttributes(node, tokens) {
  for (const attribute of node.attributes) {
    const raw = attribute.value;
    const matches = [...raw.match(TOKEN_REGEX) || []];

    if (matches.length > 0) {
      effect(() => {
        attribute.value = matches.reduce((value, match) => {
          return value.replace(match, tokens[match]());
        }, raw);
      });
    }
  }
}

/**
 * @param {Text} node
 * @param {Record<string, Function>} tokens
 */
function processTextNodes(node, tokens) {
  const raw = node.textContent ?? '';
  const matches = [...raw.match(TOKEN_REGEX) || []];

  if (matches.length > 0) {
    effect(() => {
      node.textContent = matches.reduce((content, match) => {
        return content.replace(match, tokens[match]());
      }, raw);
    });
  }
}

/**
 * @param {Element} node
 * @param {Record<string, Function>} tokens
 */
function processEvents(node, tokens) {
  for (const attribute of node.attributes) {
    if (attribute.name.startsWith('@')) {
      const eventName = attribute.name.substring(1);
      const eventListener = /** @type EventListener */(tokens[attribute.value]);

      node.removeAttribute(attribute.name);
      node.addEventListener(eventName, eventListener);
    }
  }
}

/**
 * @param {Element} node
 * @param {Record<string, Element | Element[]>} refs
 */
function processRefs(node, refs) {
  const refKey = (node.getAttribute('ref'));

  if (refKey !== null) {
    node.removeAttribute('ref');

    refs[refKey] = refKey in refs
      ? Array.isArray(refs[refKey])
        // @ts-ignore ref exists and is an array
        ? [...refs[refKey], node]
        : [refs[refKey], node]
      : node;
  }
}

/**
 * @param {string[]} strings
 * @param {array} args
 * @returns {DocumentFragment & { refs: Record<string, Element | Element[]>}}
 */
export function html(strings, ...args) {
  const [values, tokens] = tokenize(args);
  const content = zip(strings, values).join('');
  const template = document.createElement('template');

  template.innerHTML = content;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  const refs = /** @type Record<string, Element | Element[]> */({});

  while (walker.nextNode()) {
    if (walker.currentNode instanceof Text) {
      processTextNodes((walker.currentNode), tokens);
    }

    if (walker.currentNode instanceof Element) {
      processRefs(walker.currentNode, refs);
      processEvents(walker.currentNode, tokens);
      processAttributes(walker.currentNode, tokens);
    }
  }

  Object.defineProperty(template.content, 'refs', { value: refs });

  // @ts-ignore refs property defined above
  return template.content;
}
