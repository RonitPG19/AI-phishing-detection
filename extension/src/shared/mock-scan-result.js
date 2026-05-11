function containsUrgencyLanguage(subject = '') {
  return /(urgent|verify|action required|immediately|suspend|expired|password)/i.test(subject);
}

function hasSuspiciousDomain(links = []) {
  return links.some((link) => /\.(xyz|top|click|site|work|live)(\/|$)/i.test(link.href || ''));
}

function maxSeverity(levels) {
  const order = ['safe', 'low', 'medium', 'high', 'critical'];
  return levels.reduce((current, next) => order.indexOf(next) > order.indexOf(current) ? next : current, 'safe');
}

export function buildMockScanResult(payload = {}) {
  // Mock scoring keeps the extraction-to-background flow testable before the real API is connected.
  const subjectIssues = [];
  const headerIssues = [];
  const linkIssues = [];
  const attachmentIssues = [];

  if (!payload.from) {
    headerIssues.push({
      severity: 'medium',
      title: 'Sender details are incomplete'
    });
  }

  if (containsUrgencyLanguage(payload.subject)) {
    subjectIssues.push({
      severity: 'medium',
      title: 'Urgency language detected'
    });
  }

  if ((payload.links || []).length > 0) {
    linkIssues.push({
      severity: hasSuspiciousDomain(payload.links) ? 'high' : 'low',
      title: hasSuspiciousDomain(payload.links)
        ? 'Suspicious link pattern detected'
        : 'Review visible links before clicking'
    });
  }

  if ((payload.attachments || []).length > 0) {
    attachmentIssues.push({
      severity: 'low',
      title: 'Attachments present in message'
    });
  }

  const sections = {
    header: { label: 'Header', issues: headerIssues },
    subject: { label: 'Subject', issues: subjectIssues },
    body: { label: 'Body', issues: [] },
    links: { label: 'Links', issues: linkIssues },
    attachments: { label: 'Attachments', issues: attachmentIssues }
  };

  const severities = Object.values(sections)
    .flatMap((section) => section.issues.map((issue) => issue.severity));

  return {
    source: 'mock',
    status: 'preview',
    overallThreat: severities.length ? maxSeverity(severities) : 'safe',
    issueCount: severities.length,
    sections,
    timestamp: new Date().toISOString(),
    emailSubject: payload.subject || 'Current message',
    message: 'Preview mode is active until the API endpoint is connected.'
  };
}
