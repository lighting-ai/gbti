import { shuffle } from './utils.js'

/** 本页题目都选完后，翻页或出结果的延迟（毫秒） */
const AUTO_ADVANCE_MS = 380

const QUESTIONS_PER_PAGE = 2

/**
 * 答题控制器：每屏两题；本页都答完后进入下一屏；全部答完后自动回调出结果。
 * 特殊题插入逻辑同原 gate。
 */
export function createQuiz(questionsData, config, deps) {
  const { main, special } = questionsData
  const gateQ = special.find((q) => q.id === config.marginGate.questionId)
  const followUpQ = special.find((q) => q.id === config.marginGate.followUpQuestionId)
  const onComplete = typeof deps.onComplete === 'function' ? deps.onComplete : null

  const questionList = document.getElementById('questionList')
  const progressBar = document.getElementById('progressBar')
  const progressText = document.getElementById('progressText')
  const testHint = document.getElementById('testHint')

  let queue = []
  const answers = {}
  /** 当前「页」序号，第 p 页展示下标 [p*2, p*2+1] */
  let currentPageIndex = 0
  let advanceTimer = null
  let hasCompleted = false

  function buildQueue() {
    const shuffledRegular = shuffle(main)
    const insertIndex = Math.floor(Math.random() * shuffledRegular.length) + 1
    return [...shuffledRegular.slice(0, insertIndex), gateQ, ...shuffledRegular.slice(insertIndex)]
  }

  function getVisibleQuestions() {
    const visible = [...queue]
    const gateIndex = visible.findIndex((q) => q.id === config.marginGate.questionId)
    if (gateIndex !== -1 && answers[config.marginGate.questionId] === config.marginGate.insertFollowUpWhenValue) {
      visible.splice(gateIndex + 1, 0, followUpQ)
    }
    return visible
  }

  function getQuestionMetaLabel(q) {
    if (q.special) return '补充题'
    const meta = deps.dimensionMeta[q.dim]
    return `${meta.name} · ${meta.model}`
  }

  function syncOptionSelectedStyle(questionId, selectedValue) {
    questionList.querySelectorAll(`input[name="${questionId}"]`).forEach((input) => {
      const option = input.closest('.option')
      if (!option) return
      option.classList.toggle('selected', Number(input.value) === Number(selectedValue))
    })
  }

  function pageStart(pageIdx) {
    return pageIdx * QUESTIONS_PER_PAGE
  }

  function updateProgress() {
    const visibleQuestions = getVisibleQuestions()
    const total = visibleQuestions.length
    const done = visibleQuestions.filter((q) => answers[q.id] !== undefined).length
    const percent = total ? (done / total) * 100 : 0

    progressBar.style.width = `${percent}%`
    progressText.textContent = `${done} / ${total}`

    const complete = done === total && total > 0
    testHint.textContent = complete
      ? '已全部答完，即将展示结果…'
      : '每页两道题，本页都选完后进入下一页。'
  }

  function clearAdvanceTimer() {
    if (advanceTimer) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  function finishQuiz() {
    if (hasCompleted || !onComplete) return
    hasCompleted = true
    onComplete()
  }

  function checkPageCompleteAndAdvance() {
    const visible = getVisibleQuestions()
    const start = pageStart(currentPageIndex)
    const slice = visible.slice(start, start + QUESTIONS_PER_PAGE)
    const pageDone = slice.length > 0 && slice.every((q) => answers[q.id] !== undefined)

    if (!pageDone) {
      updateProgress()
      return
    }

    const total = visible.length
    const done = visible.filter((q) => answers[q.id] !== undefined).length
    const allDone = done === total && total > 0

    updateProgress()

    if (allDone) {
      clearAdvanceTimer()
      advanceTimer = setTimeout(() => {
        advanceTimer = null
        finishQuiz()
      }, AUTO_ADVANCE_MS)
      return
    }

    clearAdvanceTimer()
    advanceTimer = setTimeout(() => {
      advanceTimer = null
      currentPageIndex += 1
      renderCurrentPage()
    }, AUTO_ADVANCE_MS)
  }

  function renderCurrentPage() {
    clearAdvanceTimer()

    const visible = getVisibleQuestions()
    questionList.innerHTML = ''
    if (!visible.length) return

    const maxPageIndex = Math.max(0, Math.ceil(visible.length / QUESTIONS_PER_PAGE) - 1)
    currentPageIndex = Math.min(Math.max(0, currentPageIndex), maxPageIndex)

    const start = pageStart(currentPageIndex)
    const slice = visible.slice(start, start + QUESTIONS_PER_PAGE)

    slice.forEach((q, idx) => {
      const globalNum = start + idx + 1
      const card = document.createElement('article')
      card.className = 'question question-slide'
      card.innerHTML = `
          <div class="question-meta">
            <div class="badge">第 ${globalNum} / ${visible.length} 题</div>
            <div>${getQuestionMetaLabel(q)}</div>
          </div>
          <div class="question-title">${q.text}</div>
          <div class="options">
            ${q.options
              .map((opt, i) => {
                const code = ['A', 'B', 'C', 'D'][i] || String(i + 1)
                const isSelected = answers[q.id] === opt.value
                const checked = isSelected ? 'checked' : ''
                const selectedClass = isSelected ? ' selected' : ''
                return `
                <label class="option${selectedClass}">
                  <input type="radio" name="${q.id}" value="${opt.value}" ${checked} />
                  <strong>${code}</strong>
                  <div>${opt.label}</div>
                </label>
              `
              })
              .join('')}
          </div>
        `
      questionList.appendChild(card)
    })

    questionList.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        clearAdvanceTimer()
        const { name, value } = e.target
        onAnswerCommitted(name, value)
      })
    })

    updateProgress()
  }

  function onAnswerCommitted(name, value) {
    answers[name] = Number(value)

    if (name === config.marginGate.questionId) {
      if (Number(value) !== config.marginGate.insertFollowUpWhenValue) {
        delete answers[config.marginGate.followUpQuestionId]
      }
      const visible = getVisibleQuestions()
      const gi = visible.findIndex((q) => q.id === config.marginGate.questionId)
      currentPageIndex = gi >= 0 ? Math.floor(gi / QUESTIONS_PER_PAGE) : 0
      renderCurrentPage()
      checkPageCompleteAndAdvance()
      return
    }

    syncOptionSelectedStyle(name, value)
    checkPageCompleteAndAdvance()
  }

  function start() {
    clearAdvanceTimer()
    hasCompleted = false
    for (const k of Object.keys(answers)) delete answers[k]
    queue = buildQueue()
    currentPageIndex = 0
    renderCurrentPage()
  }

  return {
    start,
    getAnswers: () => ({ ...answers }),
  }
}
