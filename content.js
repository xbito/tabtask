// content.js

// This might gather data from the current page
const pageData = {
    title: document.title,
    url: window.location.href
  };
  
  // Example function to send data to background.js
  function sendDataToBackground() {
    chrome.runtime.sendMessage({
      type: "CREATE_TASK",
      data: pageData
    }, response => {
      console.log("Task creation:", response);
    });
  }
  
  // You could auto-run or tie this to some event
  sendDataToBackground();
  