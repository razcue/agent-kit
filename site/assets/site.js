// Copy buttons for code blocks: copies the text of the block's <pre>.
document.querySelectorAll(".code").forEach((block) => {
  const pre = block.querySelector("pre")
  const button = block.querySelector(".copy")
  if (!pre || !button) return
  const label = button.textContent
  button.addEventListener("click", async () => {
    const text = (block.dataset.copy ?? pre.innerText).trim()
    try {
      await navigator.clipboard.writeText(text)
      button.textContent = button.dataset.done ?? "Copied"
    } catch {
      button.textContent = "⌘C"
    }
    setTimeout(() => (button.textContent = label), 1600)
  })
})
