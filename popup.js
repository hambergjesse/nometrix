const defaults = {
  myUsernames: [],
  extensionEnabled: true,
  hideReplies: true,
  hideRetweets: true,
  hideLikes: true,
  hideImpressions: true,
  theme: "auto",
};

let saveTimeout;

function applyTheme(theme) {
  document.body.dataset.theme = theme === "black" ? "" : theme;
}

function syncWithXTab() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (
      !tab ||
      !tab.url ||
      !(tab.url.includes("x.com") || tab.url.includes("twitter.com"))
    ) {
      applyTheme("black");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getTheme" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not ready or other error → safe default
        applyTheme("black");
        return;
      }

      const detected = response?.theme || "black";
      applyTheme(detected);
    });
  });
}

chrome.storage.sync.get(defaults, (data) => {
  document.getElementById("usernames").value = (data.myUsernames || []).join(
    "\n"
  );
  document.getElementById("enabled").checked = data.extensionEnabled;
  document.getElementById("hideReplies").checked = data.hideReplies;
  document.getElementById("hideRetweets").checked = data.hideRetweets;
  document.getElementById("hideLikes").checked = data.hideLikes;
  document.getElementById("hideImpressions").checked = data.hideImpressions;

  const savedTheme = data.theme || "auto";
  document.getElementById("theme").value = savedTheme;

  if (savedTheme === "auto") {
    syncWithXTab();
  } else {
    applyTheme(savedTheme);
  }

  updateSubToggles();
});

// Usernames debounce
document.getElementById("usernames").addEventListener("input", () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const lines = document.getElementById("usernames").value.split("\n");
    const usernames = lines
      .map((l) => l.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);
    chrome.storage.sync.set({ myUsernames: usernames });
  }, 500);
});

// Theme change
document.getElementById("theme").addEventListener("change", (e) => {
  const val = e.target.value;
  chrome.storage.sync.set({ theme: val });
  if (val === "auto") {
    syncWithXTab();
  } else {
    applyTheme(val);
  }
});

// Master toggle
document.getElementById("enabled").addEventListener("change", () => {
  const val = document.getElementById("enabled").checked;
  chrome.storage.sync.set({ extensionEnabled: val });
  updateSubToggles();
});

// Feature toggles
["hideReplies", "hideRetweets", "hideLikes", "hideImpressions"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", () => {
      chrome.storage.sync.set({ [id]: document.getElementById(id).checked });
    });
  }
);

function updateSubToggles() {
  const enabled = document.getElementById("enabled").checked;
  const subs = ["hideReplies", "hideRetweets", "hideLikes", "hideImpressions"];
  subs.forEach((id) => (document.getElementById(id).disabled = !enabled));
  const labels = [
    "repliesLabel",
    "retweetsLabel",
    "likesLabel",
    "impressionsLabel",
  ];
  labels.forEach((id) =>
    document.getElementById(id).classList.toggle("disabled", !enabled)
  );
}
