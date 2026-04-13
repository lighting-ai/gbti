import {
  calcDimensionScores,
  scoresToLevels,
  determineGbResult,
} from "./engine.js";
import { createQuiz } from "./quiz.js";
import { renderResultView } from "./result.js";
import { initShareCardActions } from "./shareCard.js";
import "./style.css";

/**
 * 可选：在环境变量中设置 VITE_SITE_ORIGIN（不要末尾斜杠），用于补全 canonical / og:url / 分享图绝对地址。
 * 不设置时保持 index.html 中的相对路径，任意域名部署均可 fork 即用。
 */
function applyOptionalSiteOriginMeta() {
  const raw = import.meta.env.VITE_SITE_ORIGIN;
  if (!raw) return;
  const origin = String(raw).replace(/\/$/, "");
  const imageAbs = `${origin}/image/og.png`;

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${origin}/`;

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute("content", `${origin}/`);

  document
    .querySelector('meta[property="og:image"]')
    ?.setAttribute("content", imageAbs);
  document
    .querySelector('meta[name="twitter:image"]')
    ?.setAttribute("content", imageAbs);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function initHeroSpotlight(config, typeByCode) {
  const heroFeaturedTypes = config.heroFeaturedTypes;
  const spotlightState = {
    index: 0,
    timer: null,
    switching: false,
    transitionTimer: null,
  };

  function updateHeroSpotlight() {
    const current = heroFeaturedTypes[spotlightState.index];
    const spotlightImage = document.getElementById("spotlightImage");
    const spotlightTitle = document.getElementById("spotlightTitle");
    const spotlightCopy = document.getElementById("spotlightCopy");
    if (!spotlightImage || !spotlightTitle || !spotlightCopy) return;

    const t = typeByCode[current.code];
    const imageSrc = t?.image || `/image/${current.code}.png`;
    spotlightImage.src = imageSrc;
    spotlightImage.alt = `热门人格：${current.title}`;
    spotlightTitle.textContent = current.title;
    spotlightCopy.textContent = current.copy;

    document.querySelectorAll(".spotlight-dot").forEach((dot, index) => {
      dot.classList.toggle("active", index === spotlightState.index);
    });
  }

  function startHeroSpotlightAuto() {
    if (spotlightState.timer) clearInterval(spotlightState.timer);
    spotlightState.timer = setInterval(() => {
      setHeroSpotlight(spotlightState.index + 1, false);
    }, 4200);
  }

  function setHeroSpotlight(index, restartAuto = true) {
    const total = heroFeaturedTypes.length;
    const nextIndex = (index + total) % total;
    const heroSpotlight = document.getElementById("heroSpotlight");

    if (nextIndex === spotlightState.index) {
      if (restartAuto) startHeroSpotlightAuto();
      return;
    }

    if (!heroSpotlight) {
      spotlightState.index = nextIndex;
      updateHeroSpotlight();
      if (restartAuto) startHeroSpotlightAuto();
      return;
    }

    if (spotlightState.switching) return;

    spotlightState.switching = true;
    heroSpotlight.classList.add("is-switching");

    if (spotlightState.transitionTimer)
      clearTimeout(spotlightState.transitionTimer);

    spotlightState.transitionTimer = setTimeout(() => {
      spotlightState.index = nextIndex;
      updateHeroSpotlight();
      heroSpotlight.classList.remove("is-switching");
      spotlightState.switching = false;
    }, 150);

    if (restartAuto) startHeroSpotlightAuto();
  }

  const spotlightDots = document.getElementById("spotlightDots");
  if (!spotlightDots) return;

  spotlightDots.innerHTML = heroFeaturedTypes
    .map(
      (_, index) => `
        <button
          class="spotlight-dot ${index === 0 ? "active" : ""}"
          type="button"
          data-index="${index}"
          aria-label="切换到第 ${index + 1} 个热门人格"
        ></button>
      `,
    )
    .join("");

  spotlightDots.querySelectorAll(".spotlight-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      setHeroSpotlight(Number(dot.dataset.index));
    });
  });

  updateHeroSpotlight();
  startHeroSpotlightAuto();
}

function applyFooterLinks(config) {
  const links = config.footer?.links;
  if (!links) return;
  const container = document.querySelector(".footer-links");
  if (!container) return;
  container.innerHTML = links
    .map((item, i) => {
      const sep = i > 0 ? '<span class="footer-sep">·</span>' : "";
      const href = item.href ?? "#";
      const internal =
        href === "/" ||
        href === "#" ||
        (href.startsWith("/") && !href.startsWith("//"));
      const target = internal ? "_self" : "_blank";
      const rel = internal ? "" : "noopener noreferrer";
      const relAttr = rel ? ` rel="${rel}"` : "";
      return `${sep}<a href="${href}" target="${target}"${relAttr}>${item.label}</a>`;
    })
    .join("\n");
}

async function init() {
  applyOptionalSiteOriginMeta();

  const [questions, dimensions, typesData, config] = await Promise.all([
    loadJSON(`${import.meta.env.BASE_URL}data/questions.json`),
    loadJSON(`${import.meta.env.BASE_URL}data/dimensions.json`),
    loadJSON(`${import.meta.env.BASE_URL}data/types.json`),
    loadJSON(`${import.meta.env.BASE_URL}data/config.json`),
  ]);

  const standardTypes = typesData.standard;
  const typeByCode = Object.fromEntries(standardTypes.map((t) => [t.code, t]));

  const screens = {
    intro: document.getElementById("intro"),
    test: document.getElementById("test"),
    result: document.getElementById("result"),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runResult() {
    const answers = quiz.getAnswers();
    const rawScores = calcDimensionScores(
      answers,
      questions.main,
      dimensions.order,
    );
    const levels = scoresToLevels(rawScores, config.scoring.levelThresholds);
    const result = determineGbResult(
      answers,
      levels,
      dimensions.order,
      standardTypes,
      config,
    );
    renderResultView({ result, rawScores, levels, dimensions, config });
    showScreen("result");
  }

  const quiz = createQuiz(questions, config, {
    dimensionMeta: dimensions.meta,
    onComplete: runResult,
  });

  document.getElementById("startBtn").addEventListener("click", () => {
    quiz.start();
    showScreen("test");
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    quiz.start();
    showScreen("test");
  });

  document
    .getElementById("toTopBtn")
    .addEventListener("click", () => showScreen("intro"));

  const footerYear = document.getElementById("footerYear");
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  initHeroSpotlight(config, typeByCode);
  applyFooterLinks(config);

  initShareCardActions({
    getRootFull: () => document.getElementById("shareCardRoot"),
    getRootTop: () => document.getElementById("resultTopBlock"),
    getBaseFileName: () => {
      const cn = document.getElementById("resultTypeCn")?.textContent?.trim();
      const en = document.getElementById("resultTypeEn")?.textContent?.trim();
      return cn || en || "result";
    },
  });
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="padding:16px">加载失败：${String(err)}</pre>`;
});
