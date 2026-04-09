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

function stripInvisibleCharacters(value = '') {
  return String(value).replace(/[\u00ad\u034f\u061c\u200b-\u200f\u2060-\u206f\ufeff]/g, '');
}

function getText(element) {
  return stripInvisibleCharacters(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findEmail(value = '') {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function extractAllEmails(value = '') {
  return [...new Set((String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.trim()))];
}

function getReadableText(element) {
  if (!element) {
    return '';
  }

  return stripInvisibleCharacters(element.innerText || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function getNodeTop(element) {
  return element?.getBoundingClientRect?.().top ?? Number.POSITIVE_INFINITY;
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

  return /[A-Za-z@]/.test(text) || /^https?:/i.test(text);
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

export function extractVisibleOutlookLinks(root) {
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

function getVisibleBodyCandidates(root = document) {
  // Outlook layout differs across tenants and view modes, so keep body detection intentionally broad.
  return Array.from(
    root.querySelectorAll([
      '[aria-label*="Message body"]',
      '[aria-label*="Reading pane"] [role="document"]',
      '[role="document"]',
      '[data-app-section="MailReadCompose"] div[dir="ltr"]',
      '[data-app-section="MailReadCompose"] [contenteditable="false"]',
      '[data-app-section="MailReadCompose"] [data-contents="true"]'
    ].join(', '))
  )
    .filter(isVisible)
    .filter((node) => getReadableText(node));
}

export function getActiveOutlookMessageRoot(root = document) {
  // Outlook renders multiple panes; anchor extraction around the last visible body candidate.
  const bodyNode = getVisibleBodyCandidates(root).at(-1) || null;
  if (!bodyNode) {
    return null;
  }

  return bodyNode.closest('[role="main"], [data-app-section="MailReadCompose"], section') || bodyNode.parentElement || bodyNode;
}

function getSubjectCandidates(root, bodyNode) {
  return Array.from(
    root.querySelectorAll([
      '[role="heading"]',
      '[aria-level="1"]',
      '[data-app-section="MailReadCompose"] h1',
      '[data-app-section="MailReadCompose"] h2'
    ].join(', '))
  )
    .filter(isVisible)
    .filter((node) => !bodyNode || !bodyNode.contains(node))
    .filter((node) => getText(node));
}

function getSubjectText(node) {
  if (!node) {
    return '';
  }

  const clone = node.cloneNode(true);
  clone.querySelectorAll('button, [role="button"], a, input, textarea, select').forEach((element) => element.remove());

  return getText(clone)
    .replace(/\bSummarize\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getActiveOutlookSubjectNode(root = document, messageRoot = getActiveOutlookMessageRoot(root)) {
  if (!messageRoot) {
    return null;
  }

  const bodyNode = getVisibleBodyCandidates(messageRoot).at(-1) || getVisibleBodyCandidates(root).at(-1) || null;
  const candidates = getSubjectCandidates(messageRoot, bodyNode);

  candidates.sort((left, right) => {
    const leftScore = (left.getAttribute('role') === 'heading' ? 20 : 0) + (left.getAttribute('aria-level') === '1' ? 10 : 0) - getNodeTop(left);
    const rightScore = (right.getAttribute('role') === 'heading' ? 20 : 0) + (right.getAttribute('aria-level') === '1' ? 10 : 0) - getNodeTop(right);
    return rightScore - leftScore;
  });

  return candidates[0] || null;
}

export function hasActiveOutlookEmail(root = document) {
  const messageRoot = getActiveOutlookMessageRoot(root);
  if (!messageRoot) {
    return false;
  }

  const bodyNode = getVisibleBodyCandidates(messageRoot).at(-1) || getVisibleBodyCandidates(root).at(-1) || null;
  const subjectNode = getActiveOutlookSubjectNode(root, messageRoot);

  return Boolean(getSubjectText(subjectNode) && getReadableText(bodyNode));
}

function extractAddressesFromMailto(root) {
  return Array.from(root.querySelectorAll('a[href^="mailto:"]'))
    .filter(isVisible)
    .map((link) => link.href.replace(/^mailto:/i, '').split('?')[0].trim())
    .filter(Boolean);
}

function parseAddressesFromLabel(value = '') {
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      return match?.[0] || part;
    })
    .filter(Boolean);
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function getNodeCandidateValues(node) {
  if (!node) {
    return [];
  }

  const attributeValues = [...node.attributes]
    .map((attribute) => attribute?.value || '')
    .filter(Boolean);

  const dataValues = Object.values(node.dataset || {}).filter(Boolean);

  return uniqueValues([
    getText(node),
    node.innerText || '',
    node.getAttribute('title') || '',
    node.getAttribute('aria-label') || '',
    node.getAttribute('href') || '',
    node.getAttribute('email') || '',
    ...attributeValues,
    ...dataValues
  ]);
}

function extractAddresses(root, labelPrefix) {
  const prefixPattern = new RegExp(`^${labelPrefix}:?\\s*`, 'i');

  const values = Array.from(root.querySelectorAll(`[aria-label^="${labelPrefix}"], [title][aria-label^="${labelPrefix}"], [title^="${labelPrefix}"], [aria-label*="${labelPrefix}:"]`))
    .filter(isVisible)
    .flatMap((node) => {
      const label = node.getAttribute('aria-label') || node.getAttribute('title') || getText(node);
      return parseAddressesFromLabel(label.replace(prefixPattern, ''));
    });

  return [...new Set(values)];
}

function getHeaderRegion(messageRoot, bodyNode) {
  if (!messageRoot) {
    return [];
  }

  const bodyTop = bodyNode?.getBoundingClientRect?.().top ?? Number.POSITIVE_INFINITY;

  return Array.from(messageRoot.querySelectorAll('[title], [aria-label], [email], a[href^="mailto:"], button, span, div'))
    .filter(isVisible)
    .filter((node) => node.getBoundingClientRect().top < bodyTop);
}

function extractHeaderEmails(messageRoot, bodyNode) {
  const values = getHeaderRegion(messageRoot, bodyNode)
    .flatMap((node) => {
      return getNodeCandidateValues(node).flatMap((value) => extractAllEmails(value));
    });

  return uniqueValues(values);
}

function extractSenderCandidates(root, bodyNode) {
  const labeledCandidates = extractAddresses(root, 'From');
  const headerEmails = extractHeaderEmails(root, bodyNode);
  const mailtoCandidates = extractAddressesFromMailto(root);

  const headerValueCandidates = getHeaderRegion(root, bodyNode)
    .flatMap((node) => getNodeCandidateValues(node))
    .filter((value) => /from|sender|reply-to/i.test(value) || Boolean(findEmail(value)))
    .filter((value) => String(value || '').length <= 180);

  return uniqueValues([
    ...labeledCandidates,
    ...headerValueCandidates,
    ...headerEmails,
    ...mailtoCandidates
  ]);
}

function buildMinimalFromHeaders(fromCandidates = [], from) {
  const senderEmail = findEmail(from);
  const cleanCandidates = uniqueValues(
    fromCandidates
      .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((value) => value.length <= 180)
      .filter((value) => {
        const lower = value.toLowerCase();
        return !lower.includes('reply all') &&
          !lower.includes('forward') &&
          !lower.includes('summarize') &&
          !lower.startsWith('to:') &&
          !lower.startsWith('cc:');
      })
  );

  const prioritized = cleanCandidates.filter((value) => {
    const lower = value.toLowerCase();
    return lower.startsWith('from:') || Boolean(findEmail(value));
  });

  if (senderEmail && !prioritized.some((value) => findEmail(value)?.toLowerCase() === senderEmail.toLowerCase())) {
    prioritized.push(senderEmail);
  }

  return prioritized.length ? { From: prioritized } : {};
}

function extractFromAddress(root, bodyNode) {
  const candidates = extractSenderCandidates(root, bodyNode);
  const labeledEmail = candidates.map((value) => findEmail(value)).find(Boolean);
  if (labeledEmail) {
    return labeledEmail;
  }

  if (candidates.length) {
    return candidates[0];
  }

  return extractHeaderEmails(root, bodyNode)[0] || '';
}

function extractRecipientAddresses(root, labelPrefix, bodyNode) {
  const labeled = extractAddresses(root, labelPrefix);
  if (labeled.length) {
    return labeled;
  }

  return extractHeaderEmails(root, bodyNode);
}

function extractAttachments(root) {
  // This is a best-effort DOM read for now; provider APIs may be needed for richer attachment details later.
  return Array.from(root.querySelectorAll('[draggable="true"] [title], [data-icon-name="Attach"], [aria-label*="Attachment"], [aria-label*="attached"]'))
    .filter(isVisible)
    .map((node) => ({
      name: getText(node),
      type: ''
    }))
    .filter((attachment) => attachment.name)
    .filter((attachment, index, list) => list.findIndex((item) => item.name === attachment.name) === index);
}

function sanitizeHtmlNode(node) {
  if (!node) {
    return '';
  }

  const clone = node.cloneNode(true);

  clone.querySelectorAll('script, style, noscript, svg, canvas, form, button, input, textarea, select').forEach((element) => element.remove());
  clone.querySelectorAll('[aria-hidden="true"]').forEach((element) => element.remove());

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

export function extractOutlookEmailDetails(root = document) {
  const messageRoot = getActiveOutlookMessageRoot(root);
  if (!messageRoot) {
    return null;
  }

  const bodyNode = getVisibleBodyCandidates(messageRoot).at(-1) || getVisibleBodyCandidates(root).at(-1) || null;
  const subjectNode = getActiveOutlookSubjectNode(root, messageRoot);
  // Outlook address labels vary slightly across tenants/layouts, so selectors stay intentionally broad here.
  const from = extractFromAddress(messageRoot, bodyNode);
  const to = [...new Set(extractRecipientAddresses(messageRoot, 'To', bodyNode).filter((value) => value !== from))];
  const cc = [...new Set(extractRecipientAddresses(messageRoot, 'Cc', bodyNode).filter((value) => value !== from && !to.includes(value)))];

  const subject = getSubjectText(subjectNode);
  const bodyText = getReadableText(bodyNode);

  if (!subject || !bodyText) {
    // Fail closed so downstream code does not scan Outlook page layout fragments.
    return null;
  }

  const links = extractVisibleOutlookLinks(bodyNode);
  const attachments = extractAttachments(messageRoot);
  const fromCandidates = extractSenderCandidates(messageRoot, bodyNode);

  return {
    subject,
    from,
    fromCandidates,
    to,
    cc,
    bodyText,
    bodyHtml: sanitizeHtmlNode(bodyNode),
    links,
    attachments,
    headers: buildMinimalFromHeaders(fromCandidates, from),
    metadata: {
      url: window.location.href,
      linkCount: links.length,
      hasAttachments: attachments.length > 0
    }
  };
}
