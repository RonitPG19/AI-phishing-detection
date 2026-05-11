function isVisible(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getText(element) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function stripInvisibleCharacters(value = '') {
  return String(value).replace(/[\u00ad\u034f\u061c\u200b-\u200f\u2060-\u206f\ufeff]/g, '');
}

function getNodeTop(element) {
  return element?.getBoundingClientRect?.().top ?? Number.POSITIVE_INFINITY;
}

function getReadableText(element) {
  if (!element) {
    return '';
  }

  return (element.innerText || '')
    .split('\n')
    .map((line) => stripInvisibleCharacters(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function getLinkRect(link) {
  return link?.getBoundingClientRect?.() || { width: 0, height: 0 };
}

function getHostname(href) {
  try {
    return new URL(href).hostname;
  } catch {
    return '';
  }
}

function getLinkText(link) {
  if (!link) {
    return '';
  }

  const imageAlt = Array.from(link.querySelectorAll('img[alt]'))
    .map((image) => image.getAttribute('alt') || '')
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');

  const rawText = getText(link) || link.getAttribute('aria-label') || link.getAttribute('title') || imageAlt;
  const normalized = stripInvisibleCharacters(rawText).replace(/\s+/g, ' ').trim();

  if (normalized) {
    return normalized;
  }

  const rect = getLinkRect(link);
  const hostname = getHostname(link.href);
  const hasImage = Boolean(link.querySelector('img'));

  // Preserve larger image/button links even when the sender omitted visible text.
  if (hasImage && (rect.width >= 32 || rect.height >= 20)) {
    return hostname ? `[image link] ${hostname}` : '[image link]';
  }

  if (rect.width >= 96 || rect.height >= 28) {
    return hostname ? `[button link] ${hostname}` : '[button link]';
  }

  return '';
}

function isMeaningfulLink(link, text, href) {
  if (!href) {
    return false;
  }

  if (!/^https?:|^mailto:/i.test(href)) {
    return false;
  }

  if (href.startsWith('mailto:')) {
    return true;
  }

  if (!text) {
    const rect = getLinkRect(link);
    const hasImage = Boolean(link?.querySelector?.('img'));
    return hasImage && (rect.width >= 32 || rect.height >= 20);
  }

  if (text.startsWith('[image link]') || text.startsWith('[button link]')) {
    return true;
  }

  // Ignore icon / counter anchors that do not add useful phishing context.
  if (!/[A-Za-z@]/.test(text) && !/^https?:/i.test(text)) {
      return false;
  }

  return true;
}

function dedupeByHref(links) {
  const seen = new Set();

  return links.filter((link) => {
    const href = link.href || '';
    if (!href || seen.has(href)) {
      return false;
    }

    seen.add(href);
    return true;
  });
}

export function extractVisibleLinks(root) {
  if (!root) {
    return [];
  }

  return dedupeByHref(
    Array.from(root.querySelectorAll('a[href]'))
      .filter(isVisible)
      .map((link) => {
        const text = getLinkText(link);
        return {
          element: link,
          text: text.length > 180 ? `${text.slice(0, 177)}...` : text,
          href: link.href
        };
      })
      .filter((link) => isMeaningfulLink(link.element, link.text, link.href))
      .map(({ text, href }) => ({ text, href }))
  );
}

function getVisibleMessageRoots(root = document) {
  // Gmail thread views can keep older messages mounted; filter to visible content blocks only.
  return Array.from(root.querySelectorAll('.adn.ads'))
    .filter(isVisible)
    .filter((node) => node.querySelector('.a3s, .ii.gt'));
}

export function getActiveGmailMessageRoot(root = document) {
  // Gmail keeps prior messages mounted in the thread view; prefer the last visible message body.
  const candidates = getVisibleMessageRoots(root);
  return candidates.at(-1) || null;
}

function getActiveGmailSubjectNode(root = document, messageRoot = getActiveGmailMessageRoot(root)) {
  if (!messageRoot) {
    return null;
  }

  const threadRoot = messageRoot.closest('[role="main"]') || root;
  const subjectSelectors = [
    'h2.hP',
    'h2[data-thread-perm-id]',
    '.ha h2',
    '[data-thread-perm-id]'
  ];

  const candidates = subjectSelectors
    .flatMap((selector) => Array.from(threadRoot.querySelectorAll(selector)))
    .filter(isVisible)
    .filter((node) => !node.closest('.a3s, .ii.gt'))
    .filter((node) => getText(node));

  candidates.sort((left, right) => {
    const leftScore = (left.matches('h2.hP') ? 20 : 0) + (left.hasAttribute('data-thread-perm-id') ? 10 : 0) - getNodeTop(left);
    const rightScore = (right.matches('h2.hP') ? 20 : 0) + (right.hasAttribute('data-thread-perm-id') ? 10 : 0) - getNodeTop(right);
    return rightScore - leftScore;
  });

  return candidates[0] || null;
}

export function hasActiveGmailEmail(root = document) {
  const messageRoot = getActiveGmailMessageRoot(root);
  if (!messageRoot) {
    return false;
  }

  const subjectNode = getActiveGmailSubjectNode(root, messageRoot);
  const bodyNode = messageRoot.querySelector('.a3s, .ii.gt');

  return Boolean(getText(subjectNode) && getReadableText(bodyNode));
}

function extractEmailAddresses(nodes) {
  // Gmail exposes addresses either in `email` attributes or as plain text, depending on expansion state.
  const values = nodes
    .map((node) => node.getAttribute('email') || getText(node))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function extractAttachments(root) {
  if (!root) {
    return [];
  }

  // Attachment markers are best-effort here; exact metadata can be upgraded later if needed.
  return Array.from(root.querySelectorAll('[download_url], .aQy'))
    .filter(isVisible)
    .map((node) => ({
      name: getText(node),
      type: node.getAttribute('download_url') || ''
    }))
    .filter((attachment) => attachment.name);
}

function getThreadIdFromUrl() {
  const match = window.location.href.match(/[#/]([A-Za-z0-9_-]{10,})$/);
  return match?.[1] || '';
}

function sanitizeHtmlNode(node) {
  if (!node) {
    return '';
  }

  // Keep structural HTML for downstream analysis, but strip Gmail-specific rendering noise.
  const clone = node.cloneNode(true);

  clone.querySelectorAll('script, style, noscript, svg, canvas, form, button, input, textarea, select').forEach((element) => element.remove());
  clone.querySelectorAll('.yj6qo, .gmail_quote, [aria-hidden="true"]').forEach((element) => element.remove());

  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const cleaned = stripInvisibleCharacters(textNode.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]{2,}/g, ' ');

    // Spacer-heavy newsletter HTML often injects invisible-only text nodes that add noise but no signal.
    if (!cleaned.trim()) {
      textNode.remove();
      return;
    }

    textNode.textContent = cleaned;
  });

  clone.querySelectorAll('*').forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const allowed = new Set(['href', 'src', 'alt']);

    [...element.attributes].forEach((attribute) => {
      if (!allowed.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    });

    if (tag === 'a' && !element.getAttribute('href')) {
      element.removeAttribute('target');
    }
  });

  clone.querySelectorAll('*').forEach((element) => {
    const tag = element.tagName.toLowerCase();
    const keepStructuralTag = new Set(['a', 'img', 'br', 'hr', 'td', 'tr', 'tbody', 'table']).has(tag);

    if (!keepStructuralTag && !element.children.length && !stripInvisibleCharacters(element.textContent || '').trim()) {
      element.remove();
    }
  });

  return clone.innerHTML
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractGmailEmailDetails(root = document) {
  const messageRoot = getActiveGmailMessageRoot(root);
  if (!messageRoot) {
    return null;
  }

  const subjectNode = getActiveGmailSubjectNode(root, messageRoot);
  const fromNode = messageRoot.querySelector('.gD[email], .gD');
  const toNodes = Array.from(messageRoot.querySelectorAll('.g2 [email], .hb [email], span[email]')).filter(isVisible);
  const bodyNode = messageRoot.querySelector('.a3s, .ii.gt');

  const subject = getText(subjectNode);
  const bodyText = getReadableText(bodyNode);

  if (!subject || !bodyText) {
    // Fail closed so downstream code does not scan partial Gmail UI fragments.
    return null;
  }

  const from = fromNode?.getAttribute('email') || getText(fromNode);
  const recipients = extractEmailAddresses(toNodes).filter((email) => email !== from);
  // Links and attachments are still useful for local debug and mock scoring even if the API payload is trimmed later.
  const links = extractVisibleLinks(bodyNode);
  const attachments = extractAttachments(messageRoot);

  return {
    subject,
    from,
    to: recipients,
    cc: [],
    bodyText,
    bodyHtml: sanitizeHtmlNode(bodyNode),
    links,
    attachments,
    headers: {},
    metadata: {
      url: window.location.href,
      threadId: getThreadIdFromUrl(),
      linkCount: links.length,
      hasAttachments: attachments.length > 0
    }
  };
}
