import { shuffle } from './utils.js'

/**
 * 答题控制器：一页展示全部题目（保留原 GBTI 交互），特殊题插入逻辑对齐 SBTI 的 gate 模式
 */
export function createQuiz(questionsData, config, deps) {
  const { main, special } = questionsData
  const gateQ = special.find((q) => q.id === config.marginGate.questionId)
  const followUpQ = special.find((q) => q.id === config.marginGate.followUpQuestionId)

  const questionList = document.getElementById('questionList')
  const progressBar = document.getElementById('progressBar')
  const progressText = document.getElementById('progressText')
  const submitBtn = document.getElementById('submitBtn')
  const testHint = document.getElementById('testHint')

  let queue = []
  const answers = {}

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

  function updateProgress() {
    const visibleQuestions = getVisibleQuestions()
    const total = visibleQuestions.length
    const done = visibleQuestions.filter((q) => answers[q.id] !== undefined).length
    const percent = total ? (done / total) * 100 : 0

    progressBar.style.width = `${percent}%`
    progressText.textContent = `${done} / ${total}`

    const complete = done === total && total > 0
    submitBtn.disabled = !complete
    testHint.textContent = complete
      ? '全部完成。准备查看你的股民画像。'
      : '做完所有题再看结果，别像下单一样冲动。'
  }

  function renderQuestions() {
    const visibleQuestions = getVisibleQuestions()
    questionList.innerHTML = ''

    visibleQuestions.forEach((q, index) => {
      const card = document.createElement('article')
      card.className = 'question'
      card.innerHTML = `
          <div class="question-meta">
            <div class="badge">第 ${index + 1} 题</div>
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
        const { name, value } = e.target
        answers[name] = Number(value)
        syncOptionSelectedStyle(name, value)

        if (name === config.marginGate.questionId) {
          if (Number(value) !== config.marginGate.insertFollowUpWhenValue) {
            delete answers[config.marginGate.followUpQuestionId]
          }
          renderQuestions()
          return
        }

        updateProgress()
      })
    })

    updateProgress()
  }

  function start() {
    for (const k of Object.keys(answers)) delete answers[k]
    queue = buildQueue()
    renderQuestions()
  }

  return {
    start,
    getAnswers: () => ({ ...answers }),
  }
}
