if (typeof window !== "undefined" && !window.__CHURVOX_KIWI_COPY_GUARD__) {
  window.__CHURVOX_KIWI_COPY_GUARD__ = true;

  const replaceCopy = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const text = node.nodeValue || "";
      if (/dossier/i.test(text)) node.nodeValue = text.replace(/dossier/gi, "file");
    });
  };

  window.addEventListener("load", replaceCopy);
  window.addEventListener("hashchange", () => setTimeout(replaceCopy, 40));
  document.addEventListener("click", () => setTimeout(replaceCopy, 80), true);
  const observer = new MutationObserver(() => replaceCopy());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(replaceCopy, 0);
}
