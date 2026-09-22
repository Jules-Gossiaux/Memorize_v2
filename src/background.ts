function setupContextMenu(): void {
  void chrome.contextMenus
    .removeAll()
    .then(() => {
      chrome.contextMenus.create({
        id: "memorize-translate-selection",
        title: "Traduire avec Memorize",
        contexts: ["selection"],
      });
    })
    .catch(() => undefined);
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get("memorize:data");
  setupContextMenu();
});
chrome.runtime.onStartup.addListener(setupContextMenu);
setupContextMenu();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "memorize-translate-selection" || !info.selectionText)
    return;
  const pending = {
    text: info.selectionText.trim(),
    url: tab?.url ?? "",
    context: "",
  };
  void chrome.storage.local.set({ "memorize:pending-selection": pending });
  void chrome.windows.create({
    url: chrome.runtime.getURL("src/popup/index.html?from=context"),
    type: "popup",
    width: 520,
    height: 620,
    focused: true,
  });
});
