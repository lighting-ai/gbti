function defaultProfile(type) {
  return {
    remark: `${type.cn}风格目前采用通用画像，后续可继续细化专属文案。`,
    tags: ['交易风格', '风险管理', '节奏偏好'],
    scenes: ['你会根据当下市场结构调整交易动作。', '你对收益和回撤有自己的一套平衡标准。', '你更容易在熟悉的节奏中发挥稳定。'],
    mantras: ['先想风险，再谈收益。', '计划比情绪更重要。', '一致性是长期优势。'],
    tips: ['保持复盘，持续迭代策略。', '在顺风期也要控制仓位膨胀。', '把规则写下来并严格执行。'],
    reasons: {
      main: '综合画像',
      second: '风格匹配',
      third: '规则执行',
      judge: `系统识别到你与 ${type.cn} 的特征相近，属于该风格的代表画像。`,
    },
  }
}

function getTypeProfile(type) {
  return type.profile || defaultProfile(type)
}

function renderListById(id, items) {
  const target = document.getElementById(id)
  if (!target) return
  target.innerHTML = items.map((item) => `<li>${item}</li>`).join('')
}

function renderTagList(tags) {
  const target = document.getElementById('tagList')
  if (!target) return
  target.innerHTML = tags.map((tag) => `<span class="chip">${tag}</span>`).join('')
}

function renderDimList(result, dimensions, dimensionOrder) {
  const dimList = document.getElementById('dimList')
  if (!dimList) return
  const { meta, levelTexts } = dimensions
  dimList.innerHTML = dimensionOrder
    .map((dim) => {
      const level = result.levels[dim]
      const explanation = levelTexts[dim][level]
      return `
          <div class="dim-item">
            <div class="dim-item-top">
              <div class="dim-item-name">${meta[dim].name}</div>
              <div class="dim-item-score">${level} / ${result.rawScores[dim]} 分</div>
            </div>
            <p>${explanation}</p>
          </div>
        `
    })
    .join('')
}

/**
 * @param {object} payload
 */
export function renderResultView(payload) {
  const { result, rawScores, levels, dimensions, config } = payload
  const { mode, primary } = result
  const dimensionOrder = dimensions.order
  const type = primary
  const profile = getTypeProfile(type)

  let modeKicker = '你的主类型'
  let badge = `匹配度 ${primary.similarity}% · 精准命中 ${primary.exact}/15 维`
  let sub = '维度命中度较高，当前结果可视为你的交易风格画像。'

  if (mode === 'allIn') {
    modeKicker = config.display.allInMode.kicker
    badge = config.display.allInMode.badge
    sub = config.display.allInMode.sub
  } else if (mode === 'fallback') {
    modeKicker = config.display.fallbackMode.kicker
    badge = config.display.fallbackMode.badgeTemplate.replace('{similarity}', String(primary.similarity))
    sub = config.display.fallbackMode.sub
  }

  document.getElementById('resultModeKicker').textContent = modeKicker
  document.getElementById('resultTypeCn').textContent = type.cn
  document.getElementById('resultTypeEn').textContent = type.code.replace(/_/g, ' ')
  document.getElementById('matchBadge').textContent = badge
  document.getElementById('resultTypeSub').textContent = sub
  document.getElementById('resultDesc').textContent = type.desc
  document.getElementById('posterCaption').textContent = type.intro
  document.getElementById('resultRemark').textContent = profile.remark
  document.getElementById('reasonMain').textContent = profile.reasons.main
  document.getElementById('reasonSecond').textContent = profile.reasons.second
  document.getElementById('reasonThird').textContent = profile.reasons.third
  document.getElementById('reasonJudge').textContent = profile.reasons.judge

  renderTagList(profile.tags)
  renderListById('sceneList', profile.scenes)
  renderListById('mantraList', profile.mantras)
  renderListById('tipList', profile.tips)

  const special = mode === 'allIn' || mode === 'fallback'
  document.getElementById('funNote').textContent = special ? config.display.funNoteSpecial : config.display.funNoteNormal

  const posterBox = document.getElementById('posterBox')
  const posterImage = document.getElementById('posterImage')
  const imageSrc = type.image

  posterImage.onerror = () => {
    posterImage.removeAttribute('src')
    posterBox.classList.add('no-image')
    document.getElementById('posterCaption').textContent = `占位图：${type.code}.png（待补充）`
  }

  if (imageSrc) {
    posterImage.src = imageSrc
    posterImage.alt = `${type.code}（${type.cn}）`
    posterBox.classList.remove('no-image')
  } else {
    posterImage.removeAttribute('src')
    posterImage.alt = ''
    posterBox.classList.add('no-image')
  }

  renderDimList({ rawScores, levels }, dimensions, dimensionOrder)
}
