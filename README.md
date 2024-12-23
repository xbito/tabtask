# TabTask

This Chrome extension helps you quickly create Google Tasks from your current tab with a locally running LLM.

## Features

- Automatically fetches the current tab's title and URL.
- Cleans up YouTube titles and URLs.
- Uses a local LLM to suggest the best Google Task list and action.
- Allows manual adjustments before creating the task.
- Provides a confirmation link to the newly created task.

## Installation

1. Clone or download this repository from GitHub.
2. Open Chrome and go to `chrome://extensions`.
3. Enable “Developer mode” (top-right).
4. Click “Load unpacked” and select the `tabtask` folder.
5. Ensure you have Ollama running and the Llama3.1 model installed.

## Usage

1. Click on “Prepare Task” to fetch the current tab’s title and URL.
2. Adjust the Task List, Title, and Notes as needed.
3. Click “Create Task” to add the task to Google Tasks.
4. A confirmation message with a link to the task will appear upon success.

Note: Ollama may choose to unload itself or the model from memory. The first time you interact with the tool after a while it may take some time to perform the task.

## Dependencies

- Uses OAuth 2.0 for Google Tasks authorization.
- Relies on Chrome extension APIs (identity, tabs).
- Ollama locally running with Llama 3.1 installed. Ollama must be configured to accept the right origin to avoid CORS issues.

## Future

This project currently depends on running Ollama, even with a small model this may be a bit inefficient, slow, or technically difficult. However, Google has announced that future iterations of Chrome will include a Gemini-nano LLM running in-browser. You can read more about it here: [Google Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in). When this is widely available, I'll probably re-write the code and at that point publish the extension in the store.

## License

Please see any applicable LICENSE file or add your own preferred license.