chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "memorize:get-selection") return false;
  const selectionObject = window.getSelection();
  const selection = selectionObject?.toString().trim() ?? "";
  const context = getSelectionContext(selectionObject, selection);
  sendResponse({
    text: selection,
    url: window.location.href,
    context,
  });
  return true;
});

function getSelectionContext(
  selection: Selection | null,
  text: string,
): string {
  const parentText =
    selection?.anchorNode?.parentElement?.innerText ??
    document.body?.innerText ??
    "";
  if (!text || !parentText) return "";
  const index = parentText
    .toLocaleLowerCase()
    .indexOf(text.toLocaleLowerCase());
  if (index < 0) return parentText.slice(0, 500);
  return parentText.slice(Math.max(0, index - 220), index + text.length + 220);
}
