/** Fisher-Yates shuffle */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Insert item at random index (0 .. length inclusive) */
export function insertAtRandom(arr, item) {
  const a = [...arr]
  const idx = Math.floor(Math.random() * (a.length + 1))
  a.splice(idx, 0, item)
  return a
}

/** Insert after first element with id === afterId */
export function insertAfter(arr, afterId, item) {
  const a = [...arr]
  const idx = a.findIndex((q) => q.id === afterId)
  if (idx >= 0) a.splice(idx + 1, 0, item)
  return a
}
