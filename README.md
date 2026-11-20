# merobot.org

MEROBOT 的单页英文官网。视觉概念是 **“Field Station / 野外观察站”**：一页来自机器人实验室的田野笔记，暖色纸面、手绘草甸、黄铜与铁锈色的机器人，以及硬朗、清晰的现代技术排版。中央机器人仍保留完整的待命与悬停互动，左右四张 field note 卡片对应 Research、Education、Projects、Solutions，底部是四个预留入口与联系方式通栏。

当前状态：**v2 视觉方向样稿，等待确认后部署。**

## 本地预览

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。

## 交互

- 机器人待命：呼吸式浮动、地面阴影、随机眨眼、围巾和肩头植物随风轻摆，手里的鸟会轻轻点头。
- 鼠标移动：头部微微转动，眼睛跟随光标。
- 悬停或聚焦任一轨道卡/顶部 tab，机器人切换表情与动作：
  - Research：抬头观察，出现叶片放大镜与萤火；
  - Education：开心，学士帽落下；
  - Projects：兴奋，抬臂挥手，纸飞机起飞；
  - Solutions：眨眼，纸灯笼亮起。
- 点击卡片或顶部 tab 可锁定状态；再次点击或按 `Esc` 取消。
- 支持键盘焦点、`prefers-reduced-motion`、移动端点击。
- 1440×900、1366×768、1024×768 下保持单屏；窄屏自动切换为可滚动布局。

## 视觉规范

- **概念**：吉卜力式的自然与机械共存，但不是复制作品；画面全部为原创 SVG/程序化纹理。
- **气质**：温暖、手绘、略带旧纸感；技术层则使用精确的网格、坐标标注和等宽字。
- **字体**：Archivo（可变宽度，硬朗无衬线）+ IBM Plex Mono（标签/数据）。
- **颜色**：暖纸 `#f3e9d3`、森林绿 `#22362b`、苔藓 `#6f8b62`、赭金 `#d2a04a`、铁锈 `#a95433`。
- **纹理**：SVG 颗粒、等高线背景、程序生成的水彩叠色；全部本地资源，无第三方请求。

## 文件结构

```text
/
├─ index.html                 # 首页（文案、场景 SVG、机器人、四张 field note）
├─ 404.html                   # 404 页面（“Off the map.”）
├─ assets/
│  ├─ css/fonts.css           # 自托管字体声明
│  ├─ css/style.css           # 设计系统、布局、机器人/场景动画、响应式
│  ├─ js/main.js              # 机器人状态、鼠标追踪、锁定交互
│  ├─ fonts/                  # Archivo / IBM Plex Mono + OFL
│  └─ img/
│     ├─ favicon.svg
│     ├─ apple-touch-icon.png
│     ├─ og-cover.jpg         # 1200×630 分享图
│     ├─ grain.svg            # 纸张颗粒
│     ├─ contours.svg         # 等高线纹理
│     └─ wash.webp            # 程序生成的水彩叠色
├─ _headers                   # Cloudflare Pages 安全响应头与缓存
├─ _redirects                 # /index.html → /
├─ robots.txt
├─ sitemap.xml
└─ site.webmanifest
```

`tools/` 是本地设计工具（截图、纹理与 OG 渲染脚本），已加入 `.gitignore`，不会部署。

## 待确认 / 替换清单

1. **联系邮箱**：目前使用 `hello@merobot.org`，请确认可用；全站共 4 处 mailto。
2. **品牌文案**：`MEROBOT`、`Field robotics lab`、首页标题与简介目前为拟定文案。
3. **四张卡片**：标题和一句话描述为占位内容，需替换为真实方向。
4. **底部四个入口**：Notes / Publications / Resources 当前标注 `Soon` 且不可点击；Collaborate 指向邮箱。
5. **页脚年份**：当前为 `© 2026`。
6. **社交链接**：首版未放 GitHub / LinkedIn / X，避免空链接。

文案集中在 `index.html`；颜色、字体、间距集中在 `assets/css/style.css` 顶部 `:root`；机器人场景在 `index.html` 的内联 SVG 中。

## 部署到 Cloudflare Pages

推荐通过 GitHub 自动部署：

1. 创建 GitHub 仓库并推送本项目（分支 `main`）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库，Framework preset 选 `None`。
4. Build command 留空；Build output directory 填 `/`（项目根目录）。
5. 保存并部署。首次部署后，在 Custom domains 添加 `merobot.org` 和 `www.merobot.org`。
6. 域名已在 Cloudflare 托管时，按提示创建/保留代理记录；不要删除现有 mail 相关 MX/TXT 记录。

也可以不用 Git，直接上传：

```powershell
npx wrangler pages deploy . --project-name=merobot
```

> `_headers`、`_redirects`、`404.html` 会被 Cloudflare Pages 自动识别。安全响应头包含 CSP，新增第三方脚本、分析或嵌入内容时需要同步调整 CSP。若 Cloudflare 的 Email Address Obfuscation、Rocket Loader 或 Web Analytics 会向页面注入脚本，上线前请关闭或把对应域名加入 CSP。

## 上线前检查

- [ ] 替换并验证联系邮箱
- [ ] 替换四张卡片与首页文案
- [ ] 确认底部四个模块的去向
- [ ] 检查 `sitemap.xml` 中的日期
- [ ] 在 `https://merobot.org/` 验证 HTTPS、404、OG 预览与移动端
- [ ] 用 Lighthouse 跑一次 Performance / Accessibility / Best Practices / SEO
