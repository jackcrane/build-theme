(() => {
  const copiedResetDelayMs = 1800;

  function setCopiedState(button) {
    const defaultLabel = button.dataset.copyLabel || "Copy code";
    const copiedLabel = button.dataset.copiedLabel || "Copied";

    button.classList.add("is-copied");
    button.setAttribute("aria-label", copiedLabel);

    window.clearTimeout(button._copyResetTimer);
    button._copyResetTimer = window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", defaultLabel);
    }, copiedResetDelayMs);
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function handleCopy(button) {
    const block = button.closest(".highlight");
    if (!block) return;

    const code =
      block.querySelector(".rouge-code pre") ||
      block.querySelector("pre > code") ||
      block.querySelector("pre");
    if (!code) return;

    const text = code.textContent.replace(/\n$/, "");
    if (!text) return;

    await writeClipboard(text);
    setCopiedState(button);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".highlight__copy-button");
    if (!button) return;

    handleCopy(button).catch(() => {});
  });
})();
