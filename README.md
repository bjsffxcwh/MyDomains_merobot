# merobot.org

MEROBOT 的单页英文官网。首版定位为独立机器人实验室主页：中央是可交互的线稿机器人，左右四张轨道卡对应 Research、Education、Projects、Solutions，底部是四个预留内容入口和一条联系方式通栏。

当前状态：**设计样稿 v0.1，等待确认后部署。**

## 本地预览

在项目根目录运行：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:4173/`。

## 交互

- 机器人待命时有轻微浮动、呼吸阴影和随机眨眼。
- 鼠标移动时，头部会轻微转动，眼睛跟随光标。
- 悬停任一轨道卡或顶部导航项，机器人切换对应表情与动作：
  - Research：疑惑，抬头思考，出现问号气泡；
  - Education：开心，学士帽落下；
  - Projects：兴奋，抬臂挥手，齿轮转动；
  - Solutions：眨眼，灯泡亮起。
- 点击卡片或顶部 tab 可“锁定”该状态；再次点击或按 `Esc` 取消。
- 支持键盘焦点、`prefers-reduced-motion`、移动端点击。
- 桌面端在常见笔记本视口中保持单屏；窄屏和平板自动改为可滚动布局。

## 文件结构

```text
/
├─ index.html                 # 首页（文案、机器人 SVG、四张卡片）
├─ 404.html                   # 404 页面
├─ assets/
│  ├─ css/fonts.css           # 自托管字体声明
│  ├─ css/style.css           # 设计系统、布局、动画、响应式
│  ├─ js/main.js              # 机器人状态、鼠标追踪、锁定交互
│  ├─ fonts/                  # Instrument Serif / Manrope / IBM Plex Mono
│  └─ img/                    # favicon、Apple touch icon、OG 封面
├─ _headers                   # Cloudflare Pages 安全响应头与缓存
├─ _redirects                 # /index.html → /
├─ robots.txt
├─ sitemap.xml
└─ site.webmanifest
```

`tools/` 是本地设计工具（截图、OG 渲染脚本），已加入 `.gitignore`，不会部署。

## 待确认 / 替换清单

1. **联系邮箱**：目前使用 `hello@merobot.org`，请确认邮箱是否可用；全站共 4 处 mailto。
2. **品牌文案**：`MEROBOT`、`Independent robotics lab`、首页标题与简介目前为拟定文案。
3. **卡片标题与描述**：四张轨道卡的标题和一句话描述为占位内容，需替换为真实方向。
4. **底部四个入口**：Notes / Publications / Resources 当前标注 `Soon` 且不可点击；Collaborate 指向邮箱。后续有页面后，把模块改成链接即可。
5. **页脚年份**：当前为 `© 2026`，如有成立年份可改为 `© 2026 MEROBOT` 或加入 `Est. 20XX`。
6. **社交链接**：首版未放 GitHub / LinkedIn / X，避免空链接；确认账号后可加在页脚。

文案集中在 `index.html`，颜色和排版变量集中在 `assets/css/style.css` 顶部的 `:root`。

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

> `_headers`、`_redirects`、`404.html` 会被 Cloudflare Pages 自动识别。安全响应头包含 CSP，新增第三方脚本、分析或嵌入内容时需要同步调整 CSP。若 Cloudflare 的 Email Address Obfuscation、Rocket Loader 或 Web Analytics 会向页面注入脚本，上线前请关闭或把对应域名加入 CSP，否则联系邮箱可能无法正常显示/点击。

## 上线前检查

- [ ] 替换并验证联系邮箱
- [ ] 替换四张卡片与首页文案
- [ ] 确认底部四个模块的去向
- [ ] 检查 `sitemap.xml` 中的日期
- [ ] 在 `https://merobot.org/` 验证 HTTPS、404、OG 预览与移动端
- [ ] 用 Lighthouse 跑一次 Performance / Accessibility / Best Practices / SEO
