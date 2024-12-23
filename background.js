chrome.runtime.onInstalled.addListener(() => {
    console.log("TabTask extension installed");
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CREATE_TASK") {
      // Here, you'd call your local LLM logic to figure out
      // the best title and description from the current tab info,
      // then connect to Google Tasks
      sendResponse({ success: true });
    }
  });