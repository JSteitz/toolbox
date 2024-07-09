import { effect } from './signal.js';

/**
 * @typedef {object} TemplateResult
 * @property {DocumentFragment} content
 * @property {Token[]} tokens
 */

/**
 * @typedef {object} Token
 * @property {number} type
 * @property {number[]} indecies
 * @property {number[]} path
 */

const TokenType = {
  Attribute: 0,
  Element: 1,
  Text: 2,
};

/**
 * Elements in this list can only contain raw text and no other elements
 */
const RAW_TEXT_NODES = ['TEXTAREA', 'STYLE', 'SCRIPT', 'TITLE'];

/**
 * Matches HTML space characters
 * https://infra.spec.whatwg.org/#ascii-whitespace
 */
const SPACE_CHAR = `[ \t\n\f\r]`;

/**
 * Matches allowed characters for attribute name
 */
const ATTR_NAME_CHAR = `[^\\s"'>=/]`;

/**
 * Matches allowed characters for unquoted attribute value
 */
const ATTR_VALUE_CHAR = `[^ \t\n\f\r\`"'<>=]`;

/**
 * Matches a non boolean attribute
 */
const ATTRIBUTE_BEGIN = new RegExp(`${SPACE_CHAR}(?:${ATTR_NAME_CHAR}+${SPACE_CHAR}*=${SPACE_CHAR}*(${ATTR_VALUE_CHAR}|"|'|))`, 'g');
const ATTRIBUTE_END_QUOTE = /"/g;
const ATTRIBUTE_END_APOSTROPHE = /'/g;

/**
 * Matches a tag
 */
const TAG_BEGIN = /<[a-zA-Z][^>\s]*/g;
const TAG_END = />/g;

const TOKEN_TEXT = `$$${String(Math.random()).slice(9)}$$`;
const TOKEN_NODE = `<!--${TOKEN_TEXT}-->`;

/** @type {Map<TemplateStringsArray | string[], TemplateResult>} */
const cache = new Map();

/**
 * The `instrument` function takes a list of template strings and fills the gaps
 * between them with token strings. A specific token string is added depending
 * on the position of the gap. If the position occurs within an attribute, a
 * text token is added. Otherwise, a comment node token is used.
 *
 * For elements that can only contain plain text, the comment node token is also
 * added. For such elements, this token is not changed to an HTML node during
 * parsing and therefore remains as a pure text token in the form of a comment
 * node.
 *
 * @param {TemplateStringsArray | string[]} strings
 * @returns {string}
 */
function instrument(strings) {
  let buffer = '';
  let i = 0;
  let regex = TAG_BEGIN;
  let type = TokenType.Element;
  let partial, lastIndex, match;

  while (i < strings.length - 1) {
    partial = strings[i++];
    lastIndex = 0;

    while (lastIndex < partial.length) {
      regex.lastIndex = lastIndex;
      match = regex.exec(partial);
      lastIndex = match ? regex.lastIndex : lastIndex;

      if (regex === TAG_BEGIN && match !== null) {
        regex = ATTRIBUTE_BEGIN;
        type = TokenType.Attribute;
      } else if (regex === TAG_END && match !== null) {
        regex = TAG_BEGIN;
        type = TokenType.Element;
      } else if (regex === ATTRIBUTE_BEGIN && match === null) {
        regex = TAG_END;
      } else if (regex === ATTRIBUTE_BEGIN && match?.[1] === '"') {
        regex = ATTRIBUTE_END_QUOTE;
      } else if (regex === ATTRIBUTE_BEGIN && match?.[1] === '\'') {
        regex = ATTRIBUTE_END_APOSTROPHE;
      } else if (regex === ATTRIBUTE_END_QUOTE && match !== null) {
        regex = ATTRIBUTE_BEGIN;
      } else if (regex === ATTRIBUTE_END_APOSTROPHE && match !== null) {
        regex = ATTRIBUTE_BEGIN;
      } else {
        break;
      }
    }

    buffer += partial;
    buffer += type === TokenType.Element ? TOKEN_NODE : TOKEN_TEXT;
  }

  return buffer + strings[strings.length - 1];
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {TemplateResult}
 */
function parse(strings) {
  const context = document.createElement('template');
  context.innerHTML = instrument(strings);

  let i = 0;
  /**
   * @param {string} content
   * @param {string} searchString
   * @returns {number[]}
   */
  const indeciesOf = (content, searchString) => {
    if (content === searchString) {
      return [i++];
    }

    const indecies = /** @type {number[]} */([]);
    let offset = 0;
    let index = 0;

    while ((index = content.indexOf(searchString, offset)) !== -1) {
      indecies.push(i++);
      offset = index + searchString.length;
    }

    return indecies;
  };

  // ELEMENT = 1, COMMENT = 128
  const walker = document.createTreeWalker(context.content, 1 | 128);
  const tokens = /** @type {Token[]} */([]);

  while (walker.nextNode() !== null) {
    // Element Tokens
    if (walker.currentNode.nodeName === '#comment' && walker.currentNode.textContent === TOKEN_TEXT) {
      tokens.push({
        type: TokenType.Element,
        path: createPath(walker.currentNode),
        indecies: indeciesOf(walker.currentNode.textContent, TOKEN_TEXT),
      });
    } else {
      // Attribute Tokens
      for (let index = 0; index < /** @type {Element} */(walker.currentNode).attributes.length; index++) {
        const attribute = /** @type {Element} */(walker.currentNode).attributes[index];

        if (!attribute.value.includes(TOKEN_TEXT)) {
          continue;
        }

        tokens.push({
          type: TokenType.Attribute,
          path: createPath(walker.currentNode, index),
          indecies: indeciesOf(attribute.value, TOKEN_TEXT),
        });
      }

      // Text Tokens
      if (RAW_TEXT_NODES.includes(walker.currentNode.nodeName) && walker.currentNode.textContent?.includes(TOKEN_NODE)) {
        tokens.push({
          type: TokenType.Text,
          path: createPath(walker.currentNode),
          indecies: indeciesOf(walker.currentNode.textContent, TOKEN_NODE),
        });
      }
    }
  }

  return { content: context.content, tokens };
}

/**
 * @param {any} value
 * @returns {any}
 */
function unwrap(value) {
  return value instanceof Function ? unwrap(value()) : value;
}

/**
 * @param {string} content
 * @param {string} searchString
 * @param {any[]} values
 * @returns {string}
 */
function replaceAll(content, searchString, values) {
  for (let i = 0; i < values.length; i++) {
    content = content.replace(searchString, unwrap(values[i]));
  }

  return content;
}

/**
 * @param {Attr} attribute
 * @param {Token} token
 * @param {any[]} values
 * @returns {void}
 */
function processAttribute(attribute, token, values) {
  const content = attribute.value;
  const node = /** @type {Element} */(attribute.ownerElement);

  if (attribute.name.startsWith('@')) {
    node.removeAttribute(attribute.name);
    return node.addEventListener(
      attribute.name.substring(1),
      values[token.indecies[0]],
    );
  }

  if (attribute.name.startsWith('?')) {
    node.removeAttribute(attribute.name);
    return effect(() => {
      node.toggleAttribute(
        attribute.name.substring(1),
        unwrap(values[token.indecies[0]]) && true,
      );
    });
  }

  if (attribute.name.startsWith('.')) {
    node.removeAttribute(attribute.name);
    return effect(() => {
      // @ts-ignore we do not care what the property is
      node[attribute.name.substring(1)] = replaceAll(content, TOKEN_TEXT, values);
    });
  }

  return effect(() => {
    attribute.value = replaceAll(content, TOKEN_TEXT, values);
  });
}

/**
 * @param {Element} node
 * @param {any[]} values
 * @returns {void}
 */
function processText(node, values) {
  const content = node.textContent ?? '';

  effect(() => {
    node.textContent = replaceAll(content, TOKEN_NODE, values);
  });
}

/**
 * @param {Comment} node
 * @param {Token} token
 * @param {any[]} values
 * @returns {void}
 */
function processElement(node, token, values) {
  const parentNode = node.parentNode;
  const sibling = node.nextSibling;

  if (parentNode === null) return;

  effect(() => {
    const content = unwrap(values[token.indecies[0]]);

    if (content instanceof DocumentFragment) {
      const childNodes = [...content.childNodes];
      parentNode.insertBefore(content, sibling);
      parentNode.removeChild(node);

      return () => {
        content.replaceChildren(...childNodes);
        parentNode.insertBefore(node, sibling);
      };
    } else if (content instanceof Node) {
      parentNode.replaceChild(content, node);
      return () => {
        parentNode.replaceChild(node, content);
      };
    } else {
      if (node instanceof Comment) {
        parentNode.removeChild(node);
        node = document.createTextNode('');
        parentNode.insertBefore(node, sibling);
      }

      node.textContent = '' + content;
    }
  });
}

/**
 * @param {Node} node
 * @param {number} index
 * @returns {number[]}
 */
function createPath(node, index = -1) {
  /** @type {number[]} */
  const path = index >= 0 ? [index] : [];

  while (node.parentNode) {
    path.push(/** @type {Node[] }*/([...node.parentNode.childNodes]).indexOf(node));
    node = node.parentNode;
  }

  return path;
}

/**
 * @param {Node} root
 * @param {Token} token
 * @returns {Node}
 */
function getNodeByToken(root, token) {
  const path = token.type === TokenType.Attribute ? token.path.slice(1) : token.path;
  const node = path.reduceRight((childNode, i) => childNode.childNodes[i], root);

  return token.type === TokenType.Attribute
    ? /** @type {Element} */(node).attributes[token.path[0]]
    : node;
}

/**
 * @param {TemplateResult} template
 * @param {any[]} values
 * @returns {DocumentFragment}
 */
function compile({ content, tokens }, values) {
  const fragment = document.importNode(content, true);

  tokens
    .map((token) => /** @type {[Node, Token]} */([getNodeByToken(fragment, token), token]))
    .forEach(([node, token]) => {
      switch (token.type) {
        case TokenType.Attribute: return processAttribute(/** @type {Attr} */(node), token, values);
        case TokenType.Element: return processElement(/** @type {Comment} */(node), token, values);
        case TokenType.Text: return processText(/** @type {Element} */(node), values);
      }
    });

  return fragment;
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @param {any[]} values
 * @returns {DocumentFragment}
 */
export function html(strings, ...values) {
  return compile(/** @type {TemplateResult} */(
    cache.get(strings) ||
    cache.set(strings, parse(strings)).get(strings)
  ), values);
}
