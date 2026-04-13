/**
 * GBTI 评分引擎 — 纯函数，无 DOM 依赖（对齐 SBTI 的 Manhattan 匹配思路）
 */

const LEVEL_NUM = { L: 1, M: 2, H: 3 }

/**
 * @param {Record<string, number>} answers
 * @param {Array} mainQuestions 仅计分题
 * @param {string[]} dimensionOrder 15 维顺序
 */
export function calcDimensionScores(answers, mainQuestions, dimensionOrder) {
  const scores = {}
  for (const dim of dimensionOrder) scores[dim] = 0
  for (const q of mainQuestions) {
    const v = answers[q.id]
    if (v == null) continue
    scores[q.dim] += Number(v)
  }
  return scores
}

/**
 * @param {Record<string, number>} scores
 * @param {{ L: number[], M: number[], H: number[] }} thresholds
 */
export function scoresToLevels(scores, thresholds) {
  const levels = {}
  for (const [dim, score] of Object.entries(scores)) {
    if (score <= thresholds.L[1]) levels[dim] = 'L'
    else if (score >= thresholds.H[0]) levels[dim] = 'H'
    else levels[dim] = 'M'
  }
  return levels
}

export function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('')
}

export function matchType(userLevels, dimOrder, pattern) {
  const typeLevels = parsePattern(pattern)
  let distance = 0
  let exact = 0
  for (let i = 0; i < dimOrder.length; i++) {
    const userVal = LEVEL_NUM[userLevels[dimOrder[i]]] ?? 2
    const typeVal = LEVEL_NUM[typeLevels[i]] ?? 2
    const diff = Math.abs(userVal - typeVal)
    distance += diff
    if (diff === 0) exact++
  }
  const similarity = Math.max(0, Math.round((1 - distance / 30) * 100))
  return { distance, exact, similarity }
}

/**
 * @param {Record<string, number>} answers
 * @param {Record<string, string>} userLevels
 */
export function determineGbResult(answers, userLevels, dimOrder, standardTypes, config) {
  const rankings = standardTypes.map((type) => ({
    ...type,
    ...matchType(userLevels, dimOrder, type.pattern),
  }))
  rankings.sort((a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity)

  const best = rankings[0]

  if (answers[config.allIn.questionId] === config.allIn.triggerValue) {
    const primary = standardTypes.find((t) => t.code === config.allIn.typeCode)
    return {
      mode: 'allIn',
      primary: { ...primary, distance: 0, exact: best.exact, similarity: 100 },
      bestNormal: best,
      ranked: rankings,
    }
  }

  if (best.similarity < config.scoring.fallbackThreshold) {
    const primary = standardTypes.find((t) => t.code === config.fallback.typeCode)
    return {
      mode: 'fallback',
      primary: {
        ...primary,
        distance: best.distance,
        exact: best.exact,
        similarity: best.similarity,
      },
      bestNormal: best,
      ranked: rankings,
    }
  }

  return {
    mode: 'normal',
    primary: best,
    bestNormal: best,
    ranked: rankings,
  }
}
