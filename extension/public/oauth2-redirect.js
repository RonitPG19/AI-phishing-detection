(function () {
  const status = document.getElementById('status');
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash && window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash || '');
  const params = new URLSearchParams([
    ...searchParams.entries(),
    ...hashParams.entries()
  ]);
  const token = params.get('token') || '';
  const tokenType = params.get('tokenType') || 'Bearer';

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  if (!token) {
    setStatus('No token was returned. Check the backend OAuth redirect configuration.');
    return;
  }

  function decodeJwtPayload(jwt) {
    try {
      const payload = jwt.split('.')[1] || '';
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
      return JSON.parse(decodeURIComponent(escape(atob(padded))));
    } catch {
      return {};
    }
  }

  const claims = decodeJwtPayload(token);
  const session = {
    accessToken: token,
    refreshToken: '',
    tokenType,
    user: {
      provider: claims.provider || 'oauth',
      uid: claims.sub || 'spring-oauth-user',
      email: claims.email || '',
      name: claims.name || '',
      picture: claims.picture || ''
    },
    loggedInAt: new Date().toISOString()
  };

  chrome.storage.local.set({ tribunal_auth_session: session }, () => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message || 'Could not save OAuth session.');
      return;
    }

    setStatus('Mailbox connected. You can close this tab and reopen Tribunal.');
    window.setTimeout(() => window.close(), 900);
  });
})();
