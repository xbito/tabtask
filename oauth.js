window.onload = function() {
    document.querySelector('button').addEventListener('click', function() {
      console.log('Initiating OAuth flow...');
      const manifest = chrome.runtime.getManifest();
      
      // First log the client ID from manifest
      chrome.runtime.getManifest().oauth2.client_id &&
        console.log('Client ID:', manifest.oauth2.client_id);

      console.log("Redirect URI:", chrome.identity.getRedirectURL());
      // Use launchWebAuthFlow to see the full URL
      const authURL = {
        url: `https://accounts.google.com/o/oauth2/auth?` +
             `client_id=${manifest.oauth2.client_id}&` +
             `response_type=code&` +
             `redirect_uri=${chrome.identity.getRedirectURL()}&` +
             `scope=${encodeURIComponent(manifest.oauth2.scopes.join(' '))}&`,
        interactive: true
      };
      
      console.log('Auth URL being generated:', authURL.url);
      // Then proceed with normal auth
      chrome.identity.launchWebAuthFlow(authURL, function(redirectURL) {
        console.log('Redirect URL:', redirectURL);
        const code = redirectURL.match(/code=([^&]+)/)[1];
        console.log('Code:', code);
        
        // Exchange code for token
        fetch('https://www.googleapis.com/oauth2/v4/token', {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: `code=${code}&` +
                `client_id=${manifest.oauth2.client_id}&` +
                `client_secret=${manifest.oauth2.client_secret}&` +
                `redirect_uri=${chrome.identity.getRedirectURL()}&` +
                `grant_type=authorization_code`
        })
        .then(res => res.json())
        .then(data => {
          console.log('Token response:', data);
          console.log('Token length:', data.access_token ? data.access_token.length : 0);
          chrome.storage.local.set({ accessToken: data.access_token }, () => {
            console.log("Access token stored.");
          });
        })
        .catch(err => console.error('Token error:', err));
      });
    });
};

function initiateOAuthFlow() {
    const manifest = chrome.runtime.getManifest();
    const authURL = {
        url: `https://accounts.google.com/o/oauth2/auth?client_id=${manifest.oauth2.client_id}` +
             `&response_type=code` +
             `&redirect_uri=${chrome.identity.getRedirectURL()}` +
             `&scope=${encodeURIComponent(manifest.oauth2.scopes.join(" "))}`,
        interactive: true
    };

    chrome.identity.launchWebAuthFlow(authURL, (redirectURL) => {
        if (chrome.runtime.lastError) {
            console.error("launchWebAuthFlow error:", chrome.runtime.lastError);
            return;
        }
        if (!redirectURL) {
            console.error("No redirectURL received.");
            return;
        }
        const codeMatch = redirectURL.match(/code=([^&]+)/);
        if (!codeMatch) {
            console.error("No code parameter in redirect URL.");
            return;
        }
        const code = codeMatch[1];
        console.log("OAuth code received:", code);

        // Exchange code for token
        fetch("https://www.googleapis.com/oauth2/v4/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `code=${code}&client_id=${manifest.oauth2.client_id}` +
                  `&client_secret=${manifest.oauth2.client_secret}` +
                  `&redirect_uri=${chrome.identity.getRedirectURL()}` +
                  `&grant_type=authorization_code`
        })
        .then(res => res.json())
        .then(data => {
            if (data.access_token) {
                // Store the token in chrome.storage
                chrome.storage.local.set({ accessToken: data.access_token }, () => {
                    console.log("Access token stored.");
                });
            } else {
                console.error("No access token returned from token exchange:", data);
            }
        })
        .catch(err => console.error("Token exchange error:", err));
    });
}

// Expose function so popup.js or other scripts can call it:
window.initiateOAuthFlow = initiateOAuthFlow;