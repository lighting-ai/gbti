<p align="center">
  <img src="https://github.com/user-attachments/assets/0d080f63-53e1-4aa3-9b09-b9b9f97ae559" width="680" style="background: transparent;">
</p>

# GBTI 股民人格测试

创意是来自：小红书用户「拿住股票一百年不变」，我只是让 AI 自己 Vibe Coding 一个出来。

🔗小红书帖子链接：

- [小红书原贴链接](http://xhslink.com/o/8OeUk9GRc8M )

说明：

- 本项目仅供娱乐，不构成投资建议。

## 代码托管与推送

`package.json` **不**写死 `repository` / `bugs`，fork 后无需改依赖元数据。

在 GitHub 上新建**空仓库**（不要勾选自动添加 README），将本地 `origin` 指向你的仓库后推送：

```bash
git remote add origin https://github.com/<org-or-user>/<repo>.git
# 若已有 origin：git remote set-url origin https://github.com/<org-or-user>/<repo>.git
git push -u origin main
```

若由组织 **[lighting-ai](https://github.com/lighting-ai)** 维护主仓库，在组织下创建同名或任意名称的仓库后按上式推送即可。

## 参考与来源

- **上游参考实现（本仓库演进所基于的公开项目）**：[wenyuanw/gbti-test-web](https://github.com/wenyuanw/gbti-test-web)  
  若你 fork 或二次发布，建议保留对原作者仓库的说明与许可证要求。

- **SBTI 娱乐向人格测试（题目与算法文化）**：[UnluckyNinja/SBTI-test](https://github.com/UnluckyNinja/SBTI-test) · 线上 [sbti.unun.dev](https://sbti.unun.dev) · 原作者 [B站@蛆肉儿串儿](https://www.bilibili.com/video/BV1LpDHByET6/)

- **工程结构参考（Vite + `data/` JSON + `src/` 拆分）**：[pingfanfan/SBTI](https://github.com/pingfanfan/SBTI)

---

## 域名与 fork 部署（仓库不绑定固定域名）

**仓库里的代码 intentionally 不写死你的线上域名**，方便任何人 fork 后用自己的域名或 Pages 默认域名直接部署：

| 位置 | 说明 |
|------|------|
| `index.html` | `og:image` / `twitter:image` 使用**相对路径** `/image/og.png`，随访问时的站点域名生效。 |
| `public/data/config.json` | 页脚「GBTI 测试」为 `"/"`；「GitHub 仓库」默认 `href` 为 `#`，发布时可在该文件中改成**你的**仓库 URL。 |
| 可选 `.env` | 若你希望运行时补全 **canonical、`og:url`、分享图绝对 URL**（少数场景需要），可复制 `.env.example` 为 `.env` / `.env.production`，设置 `VITE_SITE_ORIGIN`（不要末尾斜杠）。**不设置也完全可部署。** |

**示例（仅作文档说明，不是仓库默认值）：** 若你计划在 **`https://gbti.fundpulse.shop`** 上线，可在构建环境配置：

```bash
VITE_SITE_ORIGIN=https://gbti.fundpulse.shop
```

或在本地创建 `.env.production` 写入上述一行后执行 `pnpm build`（请勿把含真实域名的 `.env` 提交到 git）。

---

## 本地开发

```bash
pnpm install
pnpm dev
```

浏览器打开终端里提示的本地地址（一般为 `http://localhost:5173`）。

生产构建：

```bash
pnpm build
```

产物在 **`dist/`** 目录。

---

## 部署方式一：Cloudflare Pages（推荐，纯静态）

适合：只想托管构建后的静态文件，由 Cloudflare CDN 提供访问，**不必**跑 Worker。

1. 将本仓库推送到 GitHub / GitLab。
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → 连接仓库。
3. 构建设置：
   - **Build command**：`pnpm install && pnpm build`
   - **Build output directory**：`dist`
   - **Root directory**：仓库根目录（留空即可）
4. （可选）在 Pages 项目 → **Settings → Environment variables** 为 **Production** 添加 `VITE_SITE_ORIGIN`，值为你的站点根 URL（如 `https://gbti.fundpulse.shop`），再重新部署。
5. **自定义域名**：Pages → **Custom domains** → 添加你的域名（示例：`gbti.fundpulse.shop`）。在 DNS（如 `fundpulse.shop` 托管在 Cloudflare）中添加 **CNAME**：主机名 **`gbti`** → 指向 Pages 提供的 `*.pages.dev` 目标。
6. 等待证书签发后访问你的 HTTPS 地址。

> **`base` 说明**：`vite.config.js` 中 `base: '/'` 表示站点挂在域名根路径。若使用 `https://<user>.github.io/<repo>/` 这类**带子路径**的地址，需把 `base` 改为 `'/<repo>/'` 并重新构建。

---

## 部署方式二：Cloudflare Workers + 静态资源（本仓库自带）

适合：用 **Worker** 作为入口，并绑定 **Workers Static Assets** 指向 `dist/`（见 `workers/gbti-worker`）。

1. `pnpm exec wrangler login`
2. `pnpm deploy`（会先 `pnpm build` 再 `wrangler deploy`）
3. 在 Cloudflare 控制台为该 Worker 绑定**自定义域名 / 路由**（将 `https://你的域名/*` 指到该 Worker）。DNS 把对应子域指向 Cloudflare 即可。

本地预览 Worker + 构建产物：

```bash
pnpm dev:worker
```

---

## 部署方式三：GitHub Pages

1. 执行 `pnpm build` 得到 `dist/`。
2. 将 `dist/` 内容发布到 GitHub Pages 使用的分支或目录（或借助 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) 等 Action）。
3. 仓库 **Settings → Pages** 中启用对应源；需要自定义域名时在 **Custom domain** 填写你的域名，并按提示配置 DNS。

若使用 **`https://<user>.github.io/<repo>/`**，务必修改 `vite.config.js` 的 `base` 为 `'/<repo>/'` 后再构建。

---

## 项目结构

```
├── public/
│   ├── data/               # 题目、维度、类型、配置（可改 JSON 定制）
│   ├── image/
│   └── favicon/
├── src/
│   ├── engine.js
│   ├── quiz.js
│   ├── result.js
│   ├── utils.js
│   ├── main.js
│   └── style.css
├── workers/gbti-worker/
├── index.html
├── vite.config.js
├── .env.example
└── package.json
```
