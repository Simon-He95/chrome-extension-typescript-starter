chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tab = tabs[0];
  if (tab.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["js/content_script.js"],
      })
      .then(() => console.log("script injected in all frames"));
  }
});
