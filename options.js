const modelSelect = document.getElementById("modelSelect");

// Wrap storage access in a DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
  // Load Ollama models
  loadModelsFromOllama();
  // Load saved model on page load
  chrome.storage.local.get(["selectedModel"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
      return; // Handle the error gracefully
    }
    if (result.selectedModel) {
      modelSelect.value = result.selectedModel;
    }
  });

  // Save model when changed
  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ selectedModel: modelSelect.value }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving to chrome.storage:", chrome.runtime.lastError);
        return; // Handle the error gracefully
      }
      console.log("Model saved:", modelSelect.value);
    });
  });

});


function loadModelsFromOllama() {
  console.log("Loading models from Ollama...");
  fetch("http://localhost:11434/api/tags")
    .then(res => res.json())
    .then(json => {
      // The API response includes `models` property with an array of objects
      const modelsArray = json.models || [];
      const modelSelect = document.getElementById("modelSelect");
      modelSelect.innerHTML = ""; // Clear existing options

      // Populate dropdown with each model's "name"
      modelsArray.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.name;           // e.g. "phi4:latest"
        opt.textContent = item.name;     // e.g. "phi4:latest"
        modelSelect.appendChild(opt);
      });

      // Restore the previously selected value, if any
      chrome.storage.local.get(["selectedModel"], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
          return; // Handle the error
        }
        if (result.selectedModel && modelsArray.some(m => m.name === result.selectedModel)) {
          modelSelect.value = result.selectedModel;
        }
      });
    })
    .catch(err => console.error("Error loading models from Ollama:", err));
}

