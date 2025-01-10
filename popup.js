let globalToken = null; // Store the token for reuse
let selectedModel = "llama3.1"; // Default model

document.getElementById("openSettingsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});



document.getElementById("createTaskBtn").addEventListener("click", () => {
    // Load model from storage on popup load
    console.log("Loading model settings from local storage...");
    chrome.storage.local.get(["selectedModel"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
            return; // Handle the error gracefully
        }
        if (result.selectedModel) {
            selectedModel = result.selectedModel;
            console.log("Loaded model:", selectedModel);
        }
    });
    console.log("Requesting current tab info...");
    document.getElementById("loadingIndicator").style.display = "block"; // Show loading indicator

    // Check if we have a stored access token
    chrome.storage.local.get(["accessToken"], (storage) => {
        const token = storage.accessToken;
        // Use the stored token instead of calling getAuthToken()
        globalToken = token;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            
            // Clean up title/URL if it's a YouTube link
            let finalTitle = currentTab.title;
            let finalUrl = currentTab.url;
            if (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be")) {
                // Remove '- YouTube' suffix
                finalTitle = finalTitle.replace(/ - YouTube$/, "");
                // Remove parenthetical digits if present, e.g. (3)
                finalTitle = finalTitle.replace(/\(\d+\)/g, "");
                // Remove time param from URL
                const urlObj = new URL(finalUrl);
                urlObj.searchParams.delete("t");
                finalUrl = urlObj.href;
            }

            console.log("Current Tab Title:", finalTitle);
            console.log("Current Tab URL:", finalUrl);
            
            fetch("https://www.googleapis.com/tasks/v1/users/@me/lists", {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(taskData => {
                console.log("Task Lists:", taskData);
                const listTitles = (taskData.items || []).map(item => item.title);
                
                // Fill the combo with Task Lists
                const form = document.getElementById("taskForm");
                const select = form.querySelector('select[name="parent"]');
                (taskData.items || []).forEach(item => {
                  const opt = document.createElement('option');
                  opt.value = item.id;
                  opt.textContent = item.title;
                  select.appendChild(opt);
                });

                // Now call the local LLM with just the titles
                fetch("http://localhost:11434/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: selectedModel,
                        stream: false,
                        prompt: `Given this tab title: ${finalTitle}
And here are the user's Task List titles: ${JSON.stringify(listTitles)}
Which Google Task list is best suited for it? Only respond with the list title, nothing else. Only use one of the provided list titles or 'Default List' if none match.`
                    })
                })
                .then(res => res.json())
                .then(llmData => {
                    console.log("Local LLM suggestion (task list):", llmData.response);
                    
                    // Example: assume LLM returns the chosen title directly
                    const chosenTitle = llmData.response || llmData;
                    let chosenList = (taskData.items || []).find(item => item.title === chosenTitle);

                    // Fallback logic
                    if (!chosenList) {
                        chosenList = (taskData.items || []).find(item => item.title === "Default List") ||
                                     (taskData.items || []).find(item => item.title === "Home") ||
                                     (taskData.items || []).sort((a, b) => new Date(a.updated) - new Date(b.updated))[0];
                    }

                    if (chosenList) {
                        // Set the combo’s default selection to the LLM suggestion
                        select.value = chosenList.id;
                        console.log("Matching list ID:", chosenList.id);
                        // Here you can use chosenList.id to create a new task
                        
                        // Now ask the LLM about user’s intended action
                        fetch("http://localhost:11434/api/generate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                model: selectedModel,
                                stream: false,
                                prompt: `Given the URL "${finalUrl}" and title "${finalTitle}", which action is the user most likely to take later? Options include Watch, Read, Apply, or anything else you think might fit. When the page seems to be a job ad, the right verb is Apply. Respond with just 1 verb. Do not provide any explnation or further information, just the action verb.`
                            })
                        })
                        .then(actionRes => actionRes.json())
                        .then(actionData => {
                            console.log("Local LLM suggestion (action):", actionData.response);

                            // If the LLM detects a job ad and suggests "Apply", set the due date to tomorrow
                            if (actionData.response && /apply/i.test(actionData.response.trim())) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const formattedDue = tomorrow.toISOString().split("T")[0];
                                const form = document.getElementById("taskForm");
                                form.querySelector("input[name='dueDate']").value = formattedDue;
                            }

                            // Decide whether to summarize the title
                            let finalTitlePromise;
                            if (finalTitle.length > 80) {
                                finalTitlePromise = fetch("http://localhost:11434/api/generate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        model: selectedModel,
                                        stream: false,
                                        prompt: `Summarize this title to under 80 characters:\n"${finalTitle}". Respond with just the summarized title.`
                                    })
                                })
                                .then(titleRes => titleRes.json())
                                .then(titleData => titleData.response || finalTitle);
                            } else {
                                finalTitlePromise = Promise.resolve(finalTitle);
                            }

                            // Create the taskObj after we have finalTitle
                            finalTitlePromise.then(finalTitle => {
                                const taskObj = {
                                    title: `${actionData.response}:${finalTitle}`,
                                    notes: finalUrl,
                                    parent: select.value
                                };
                                console.log("Final Task Object:", taskObj);

                                // Display the form
                                form.querySelector("input[name='title']").value = taskObj.title;
                                form.querySelector("textarea[name='notes']").value = taskObj.notes;
                                form.querySelector("select[name='parent']").value = taskObj.parent;
                                form.style.display = "block";
                                document.getElementById("loadingIndicator").style.display = "none"; // Hide loading indicator
                            });
                        })
                        .catch(err => {
                            console.error("Action fetch error:", err);
                            document.getElementById("loadingIndicator").style.display = "none"; // Hide loading indicator
                        });
                    } else {
                        console.error("No matching list found for title:", chosenTitle);
                        document.getElementById("loadingIndicator").style.display = "none"; // Hide loading indicator
                    }
                })
                .catch(err => {
                    console.error("Local LLM error:", err);
                    document.getElementById("loadingIndicator").style.display = "none"; // Hide loading indicator
                });
            })
            .catch(error => {
                console.error("Fetch error:", error);
                document.getElementById("loadingIndicator").style.display = "none"; // Hide loading indicator
            });
        });

    });
});

document.getElementById("saveTaskBtn").addEventListener("click", () => {
    // Retrieve the data from the form
    const form = document.getElementById("taskForm");
    const parentId = form.querySelector("select[name='parent']").value;
    const title = form.querySelector("input[name='title']").value.trim();
    const notes = form.querySelector("textarea[name='notes']").value.trim();
    const dueDate = form.querySelector("input[name='dueDate']").value;
    let dueValue = null;
    if (dueDate) {
        // Convert to a valid datetime string (RFC 3339)
        dueValue = new Date(dueDate).toISOString();
    }

    // Validate form fields
    if (!title) {
        alert("Title cannot be empty.");
        return;
    }
    if (!notes) {
        alert("Notes cannot be empty.");
        return;
    }

    // Create task in Google Tasks
    fetch(`https://www.googleapis.com/tasks/v1/lists/${parentId}/tasks`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${globalToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, notes, due: dueValue })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Created Task:", data);

        // Display a success message with a link
        if (data.id) {
            const confirmationDiv = document.getElementById("confirmation");
            confirmationDiv.style.color = "green";
            const taskLink = data.webViewLink;
            confirmationDiv.textContent = "Task created: ";
            
            const linkElem = document.createElement("a");
            linkElem.href = taskLink;
            linkElem.target = "_blank";
            linkElem.textContent = "Open in Google Tasks";
            confirmationDiv.appendChild(linkElem);
            confirmationDiv.style.display = "block";
        }
    })
    .catch(err => {
        console.error("Create Task error:", err);
        const confirmationDiv = document.getElementById("confirmation");
        confirmationDiv.style.color = "red";
        confirmationDiv.textContent = `Error creating task: ${err.message || err}`;
        confirmationDiv.style.display = "block";
    });
});