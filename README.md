# GBTI 股民人格测试

创意是来自：小红书用户「拿住股票一百年不变」，我只是让 AI 自己 Vibe Coding 一个出来。

🔗小红书帖子链接：

- [小红书原贴链接](http://xhslink.com/o/8OeUk9GRc8M)

说明：

- 本项目仅供娱乐，不构成投资建议。

## 参考与来源

- **上游参考实现（本仓库演进所基于的公开项目）**：[wenyuanw/gbti-test-web](https://github.com/wenyuanw/gbti-test-web)  
  若你 fork 或二次发布，建议保留对原作者仓库的说明与许可证要求。
- **SBTI 娱乐向人格测试（题目与算法文化）**：[UnluckyNinja/SBTI-test](https://github.com/UnluckyNinja/SBTI-test) · 线上 [sbti.unun.dev](https://sbti.unun.dev) · 原作者 [B站@蛆肉儿串儿](https://www.bilibili.com/video/BV1LpDHByET6/)
- **工程结构参考（Vite + `data/` JSON + `src/` 拆分）**：[pingfanfan/SBTI](https://github.com/pingfanfan/SBTI)

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

## Cloudflare：选 Pages 还是 Workers？

本项目是 **纯前端静态站**（Vite 构建出 `dist/`）。在 Cloudflare 上有两种常见接法，**不要混用配置**：

|                                               | **Cloudflare Pages（推荐多数场景）**                                             | **Cloudflare Workers + Static Assets（本仓库 `workers/`）**                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **是什么**                                    | 专门托管静态文件，直接把 **`dist/`** 发布到 CDN                                  | 先有一个 **Worker** 脚本作为入口，再通过 **Static Assets** 把 **`dist/`** 挂上去                                                                    |
| **仓库里的 Worker 要不要用？**                | **不用**。可忽略 `workers/gbti-worker/`，不影响站点                              | **要用**。部署的就是这个 Worker + 资源                                                                                                              |
| **`workers/gbti-worker` 里在干什么？**        | —                                                                                | `wrangler.toml` 把静态目录指到仓库根的 **`dist/`**；`worker.js` 对请求路径做简单白名单（只允许首页、静态资源、`/data/` 等），再交给 Assets 返回文件 |
| **控制台里要不要填「部署命令 / Wrangler」？** | **不要填**（或留空）。只需 **构建命令** + **输出目录 `dist`**，由 Pages 自动发布 | **要填**。必须在构建产出 `dist/` 之后执行 `wrangler deploy`，且 **必须带 `--config`**（见下表）                                                     |
| **典型命令**                                  | 构建：`pnpm install && pnpm build`                                               | 构建同上；部署：`npx wrangler deploy --config workers/gbti-worker/wrangler.toml`                                                                    |

**结论**：

- 一般选 **Pages** 即可：更简单，没有多一层 Worker，也**不需要**在面板里写 `npx wrangler deploy`。
- 只有当你**明确要用 Worker 入口**（或沿用本仓库自带的 Wrangler 流程）时，才选 **Workers**；此时根目录**没有**默认 `wrangler.toml`，部署命令**不能**只写 `npx wrangler deploy`，必须写成：

```bash
npx wrangler deploy --config workers/gbti-worker/wrangler.toml
```

（与本地 `package.json` 里的 `pnpm deploy` 一致：先 `pnpm build`，再执行上述命令。）

若 Cloudflare 提供「非生产分支」的 Wrangler 命令，同样需要能解析到 **`workers/gbti-worker/wrangler.toml`**，且该次构建必须已成功生成 **`dist/`**。

---

## 部署方式一：Cloudflare Pages（推荐，纯静态）

适合：只想托管 **`dist/`**，**不经过**本仓库里的 Worker。

1. 将本仓库推送到 GitHub / GitLab。
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → 连接仓库。
3. 构建设置：
   - **Build command**：`pnpm install && pnpm build`
   - **Build output directory**：`dist`
   - **Root directory**：仓库根目录（留空即可）
   - **不要**把「部署命令」填成 `wrangler deploy`（那是 Workers 流程）；Pages 只认构建结果目录。
4. （可选）在 Pages 项目 → **Settings → Environment variables** 为 **Production** 添加 `VITE_SITE_ORIGIN`，值为你的站点根 URL（不要末尾斜杠），再重新部署。
5. **自定义域名**：Pages → **Custom domains** → 添加你的域名。在 DNS 中为子域添加 **CNAME**，指向 Pages 给出的 `*.pages.dev` 主机名。
6. 等待证书签发后访问你的 HTTPS 地址。

> **`base` 说明**：`vite.config.js` 中 `base: '/'` 表示站点挂在域名根路径。若使用 `https://<user>.github.io/<repo>/` 这类**带子路径**的地址，需把 `base` 改为 `'/<repo>/'` 并重新构建。

---

## 部署方式二：Cloudflare Workers + 静态资源（可选）

适合：要用 **Worker + Static Assets** 发布（见上文「Workers」列）。

1. `pnpm exec wrangler login`
2. **`pnpm deploy`**（等价于 `pnpm build` 后执行 `wrangler deploy --config workers/gbti-worker/wrangler.toml`）
3. 在 Cloudflare 控制台为该 Worker 绑定**自定义域名 / 路由**，使你的域名指向该 Worker；DNS 由 Cloudflare 托管时按向导添加记录即可。

本地预览 Worker + 构建产物：

```bash
pnpm dev:worker
```

---

## 部署方式三：GitHub Pages

1. 执行 `pnpm build` 得到 `dist/`。
2. 将 `dist/` 内容发布到 GitHub Pages 使用的分支或目录（或借助 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) 等 Action）。
3. 仓库 **Settings → Pages** 中启用对应源；需要自定义域名时在 **Custom domain** 填写你的域名，并按提示配置 DNS。

若使用 `https://<user>.github.io/<repo>/`（项目站带子路径），务必修改 `vite.config.js` 的 `base` 为 `'/<repo>/'` 后再构建。

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
