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

function getInnerText(element) {
  return (element?.innerText || '').replace(/\s+\n/g, '\n').trim();
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
      .map((link) => ({
        text: getText(link),
        href: link.href
      }))
  );
}

function getVisibleBodyCandidates(root = document) {
  // Outlook layout differs across tenants and view modes, so keep body detection intentionally broad.
  return Array.from(
    root.querySelectorAll('[aria-label*="Message body"], div[role="document"], [data-app-section="MailReadCompose"] div[dir="ltr"]')
  )
    .filter(isVisible)
    .filter((node) => getInnerText(node));
}

export function getActiveOutlookMessageRoot(root = document) {
  // Outlook renders multiple panes; anchor extraction around the last visible body candidate.
  const bodyNode = getVisibleBodyCandidates(root).at(-1) || null;
  if (!bodyNode) {
    return null;
  }

  return bodyNode.closest('[role="main"], [data-app-section="MailReadCompose"], section') || bodyNode.parentElement || bodyNode;
}

export function hasActiveOutlookEmail(root = document) {
  const messageRoot = getActiveOutlookMessageRoot(root);
  if (!messageRoot) {
    return false;
  }

  const bodyNode = getVisibleBodyCandidates(messageRoot).at(-1) || getVisibleBodyCandidates(root).at(-1) || null;
  const subjectNode = messageRoot.querySelector('[role="heading"]') || root.querySelector('[role="heading"]');

  return Boolean(getText(subjectNode) && getInnerText(bodyNode));
}

function extractAddresses(root, labelPrefix) {
  // Outlook often encodes recipient rows through aria labels instead of stable mail-specific elements.
  return Array.from(root.querySelectorAll(`[aria-label^="${labelPrefix}"], [title][aria-label^="${labelPrefix}"]`))
    .filter(isVisible)
    .map((node) => getText(node))
    .filter(Boolean);
}

function extractAttachments(root) {
  // This is a best-effort DOM read for now; provider APIs may be needed for richer attachment details later.
  return Array.from(root.querySelectorAll('[draggable="true"] [title], [data-icon-name="Attach"], [aria-label*="Attachment"]'))
    .filter(isVisible)
    .map((node) => ({
      name: getText(node),
      type: ''
    }))
    .filter((attachment) => attachment.name);
}

export function extractOutlookEmailDetails(root = document) {
  const messageRoot = getActiveOutlookMessageRoot(root);
  if (!messageRoot) {
    return null;
  }

  const bodyNode = getVisibleBodyCandidates(messageRoot).at(-1) || getVisibleBodyCandidates(root).at(-1) || null;
  const subjectNode = messageRoot.querySelector('[role="heading"]') || root.querySelector('[role="heading"]');
  // Outlook address labels vary slightly across tenants/layouts, so selectors stay intentionally broad here.
  const fromCandidates = extractAddresses(messageRoot, 'From');
  const toCandidates = extractAddresses(messageRoot, 'To');
  const ccCandidates = extractAddresses(messageRoot, 'Cc');

  const subject = getText(subjectNode);
  const bodyText = getInnerText(bodyNode);

  if (!subject || !bodyText) {
    // Fail closed so downstream code does not scan Outlook page layout fragments.
    return null;
  }

  return {
    subject,
    from: fromCandidates[0] || '',
    to: [...new Set(toCandidates)],
    cc: [...new Set(ccCandidates)],
    bodyText,
    bodyHtml: bodyNode?.innerHTML || '',
    links: extractVisibleOutlookLinks(bodyNode),
    attachments: extractAttachments(messageRoot),
    headers: {},
    metadata: {
      url: window.location.href
    }
  };
}
