chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "memorize:get-selection") return false;
  const selection = window.getSelection()?.toString().trim() ?? "";
  sendResponse({
    text: selection,
    url: window.location.href,
    context: document.body?.innerText.slice(0, 500) ?? "",
  });
  return true;
});
