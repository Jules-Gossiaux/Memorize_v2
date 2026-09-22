chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "memorize:get-selection") return false;
  const selectionObject = window.getSelection();
  const selection = selectionObject?.toString().trim() ?? "";
  const context = getSelectionContext(selectionObject, selection);
  sendResponse({
    text: selection,
    url: window.location.href,
    context,
    pageLanguage: getDeclaredPageLanguage(),
    pageText: getPageText(),
  });
  return true;
});

let selectionTimer: number | undefined;
document.addEventListener("selectionchange", () => {
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    const selectionObject = window.getSelection();
    const text = selectionObject?.toString().trim() ?? "";
    if (!text) return;
    void chrome.runtime
      .sendMessage({
        type: "memorize:selection-changed",
        selection: {
          text,
          url: window.location.href,
          context: getSelectionContext(selectionObject, text),
          pageLanguage: getDeclaredPageLanguage(),
          pageText: getPageText(),
        },
      })
      .catch(() => undefined);
  }, 80);
});

function getDeclaredPageLanguage(): string | null {
  const declaredLanguage =
    document.documentElement.lang.trim().toLocaleLowerCase().split(/[-_]/)[0] ??
    "";
  return /^[a-z]{2}$/.test(declaredLanguage) ? declaredLanguage : null;
}

function getPageText(): string {
  return (document.body?.innerText?.trim() ?? "").slice(0, 20_000);
}

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
