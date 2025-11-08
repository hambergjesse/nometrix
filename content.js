let myUsernames = [];
let extensionEnabled = true;
let hideReplies = true;
let hideRetweets = true;
let hideLikes = true;
let hideImpressions = true;
let observer = null;

const numberRegex = /^(\d{1,3}(,\d{3})*(\.\d+)?[KMB]?)$/;

function hideSpans(wrapper) {
  if (!wrapper) return;
  const transition = wrapper.querySelector(
    '[data-testid="app-text-transition-container"]'
  );
  const target = transition || wrapper;
  target.querySelectorAll("span").forEach((span) => {
    const txt = span.textContent.trim();
    if (numberRegex.test(txt)) {
      span.style.visibility = "hidden";
    }
  });
}

function processTweet(article) {
  if (!article || article.dataset.processed) return;
  article.dataset.processed = "1";

  if (!extensionEnabled) return;

  // Impressions (auto on own tweets)
  if (hideImpressions) {
    const viewsLink = article.querySelector('a[href*="/analytics"]');
    if (viewsLink) hideSpans(viewsLink);
  }

  // Engagement: requires username match
  if (myUsernames.length > 0 && (hideReplies || hideRetweets || hideLikes)) {
    const nameDiv = article.querySelector('[data-testid="User-Name"]');
    if (!nameDiv) return;

    const handleSpan = Array.from(nameDiv.querySelectorAll("span")).find((s) =>
      s.textContent.startsWith("@")
    );
    if (!handleSpan) return;

    const handle = handleSpan.textContent.slice(1).toLowerCase();
    if (!myUsernames.includes(handle)) return;

    // Own tweet confirmed → hide selected
    if (hideReplies) {
      const replyBtn = article.querySelector('[data-testid="reply"]');
      if (replyBtn) hideSpans(replyBtn);
    }
    if (hideRetweets) {
      const retweetBtn = article.querySelector(
        '[data-testid="retweet"], [data-testid="unretweet"]'
      );
      if (retweetBtn) hideSpans(retweetBtn);
    }
    if (hideLikes) {
      const likeBtn = article.querySelector(
        '[data-testid="like"], [data-testid="unlike"]'
      );
      if (likeBtn) hideSpans(likeBtn);
    }
  }
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches('article[data-testid="tweet"]')) processTweet(node);
        node
          .querySelectorAll?.('article[data-testid="tweet"]')
          .forEach(processTweet);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function resetAndApply() {
  document
    .querySelectorAll('article[data-testid="tweet"]')
    .forEach((a) => delete a.dataset.processed);
  document
    .querySelectorAll('article[data-testid="tweet"]')
    .forEach(processTweet);
}

function updateHiding() {
  const shouldHide =
    extensionEnabled &&
    (hideReplies || hideRetweets || hideLikes || hideImpressions);
  if (shouldHide) {
    startObserver();
    resetAndApply();
  } else {
    stopObserver();
  }
}

// Initial load
chrome.storage.sync.get(
  {
    myUsernames: [],
    extensionEnabled: true,
    hideReplies: true,
    hideRetweets: true,
    hideLikes: true,
    hideImpressions: true,
  },
  (data) => {
    myUsernames = (data.myUsernames || []).map((s) => s.toLowerCase());
    extensionEnabled = data.extensionEnabled;
    hideReplies = data.hideReplies;
    hideRetweets = data.hideRetweets;
    hideLikes = data.hideLikes;
    hideImpressions = data.hideImpressions;
    updateHiding();
  }
);

// React to changes
chrome.storage.onChanged.addListener((changes) => {
  let changed = false;
  if ("myUsernames" in changes) {
    myUsernames = (changes.myUsernames.newValue || []).map((s) =>
      s.toLowerCase()
    );
    changed = true;
  }
  if ("extensionEnabled" in changes) {
    extensionEnabled = changes.extensionEnabled.newValue ?? true;
    changed = true;
  }
  if ("hideReplies" in changes) {
    hideReplies = changes.hideReplies.newValue ?? true;
    changed = true;
  }
  if ("hideRetweets" in changes) {
    hideRetweets = changes.hideRetweets.newValue ?? true;
    changed = true;
  }
  if ("hideLikes" in changes) {
    hideLikes = changes.hideLikes.newValue ?? true;
    changed = true;
  }
  if ("hideImpressions" in changes) {
    hideImpressions = changes.hideImpressions.newValue ?? true;
    changed = true;
  }
  if (changed) updateHiding();
});

// Theme detection for popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getTheme") {
    const bg = getComputedStyle(document.body).backgroundColor;
    let theme = "black";
    if (bg === "rgb(255, 255, 255)") theme = "light";
    else if (bg === "rgb(21, 32, 43)") theme = "dim";
    sendResponse({ theme });
  }
});
