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

function getReadableText(element) {
  if (!element) {
    return '';
  }

  return (element.innerText || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
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
      .map((link) => ({
        text: getText(link),
        href: link.href
      }))
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

export function hasActiveGmailEmail(root = document) {
  const messageRoot = getActiveGmailMessageRoot(root);
  if (!messageRoot) {
    return false;
  }

  const subjectNode = root.querySelector('h2.hP, h2[data-thread-perm-id]');
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

  const subjectNode = root.querySelector('h2.hP, h2[data-thread-perm-id]');
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
