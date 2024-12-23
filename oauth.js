window.onload = function() {
    document.querySelector('button').addEventListener('click', function() {
      console.log('Initiating OAuth flow...');
      const manifest = chrome.runtime.getManifest();
      
      // First log the client ID from manifest
      chrome.runtime.getManifest().oauth2.client_id &&
        console.log('Client ID:', manifest.oauth2.client_id);
      
      // Use launchWebAuthFlow to see the full URL
      const authURL = {
        url: `https://accounts.google.com/o/oauth2/auth?` +
             `client_id=${manifest.oauth2.client_id}&` +
             `response_type=token&` +
             `redirect_uri=${chrome.identity.getRedirectURL()}&` +
             `scope=${encodeURIComponent(manifest.oauth2.scopes.join(' '))}&`,
        interactive: true
      };
      
      console.log('Auth URL being generated:', authURL.url);
      
      // Then proceed with normal auth
      chrome.identity.getAuthToken({interactive: true}, function(token) {
        if (chrome.runtime.lastError) {
          console.error('OAuth Error:', chrome.runtime.lastError);
          console.log('Details:', {
            message: chrome.runtime.lastError.message,
            stack: new Error().stack
          });
          return;
        }
        
        console.log('Token received:', token ? 'success' : 'null');
        console.log('Token length:', token ? token.length : 0);
      });
    });
};