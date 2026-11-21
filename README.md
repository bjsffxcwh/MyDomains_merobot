# merobot.org

MEROBOT 的单页英文官网。v6 视觉方向是 **Field Station / 场地档案**：草甸是舞台，MR—01 是常驻的主人，四则笔记是一张铺在草地上的纸。首屏负责“到达”，内容允许向下滚动。

- 线上地址：https://merobot.org
- GitHub：https://github.com/bjsffxcwh/MyDomains_merobot
- Cloudflare Pages 项目：`mydomains-merobot`（Production 分支 `main`）
- 当前版本：v6.1.x（2026-11-21）

## 本地预览

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。页面使用根路径 `/assets/...`，请用 HTTP 打开，不要直接双击 `index.html`。

## 交互

- **世界不跟鼠标。** 草甸图片完全静止；只有太阳呼吸、雾、鸟群、光点的慢速自主动效。
- **MR—01 只做注视。** 鼠标移动时，眼睛/头部最多 4 单位、2.2°；64px 死区；指针停下即停止。
- **首次进入有问候。** 首访/回访/时段/鼠标或触屏不同措辞；逐字显示 + `aria-live` 整句播报；机器人挥手；点击机器人可再说一句。
- **平静期有空闲导演。** `rest / observe / fidget / social` 状态机，12 种动作；台词由上下文 + 组合语法生成，最近 9 句去重。
- **四则笔记**：hover/focus 预览对应表情与道具；click/Enter 固定（PINNED + `aria-pressed`）；Esc 或再点释放；触屏点按固定/释放。
- **Motion / Calm**：暂停装饰动画与空闲导演，台词直接显示；选择持久化；系统 `prefers-reduced-motion` 默认 Calm。

## 视觉规范

- **网格**：12 栏，最大 1560px，gutter `clamp(24px, 4.2vw, 64px)`。
- **字体**：Archivo（可变宽度）+ IBM Plex Mono；H1 800、`font-stretch: 112%`、-0.05em。
- **字号**：1440 下 H1 106.56px、正文 17px、笔记描述 16px、内容标签 11–11.5px；窄屏顶部控件 10px。
- **颜色**：墨绿 `#14271e`、冷纸 `#f3f7ef`、纸面 `#f1f5ec`、珊瑚 `#c9502f`、深珊瑚文字 `#a63f23`、苔藓 `#5f8a6c`、雾蓝 `#6f9fae`。
- **材质**：纸片 1px 边、2–3px 圆角、极轻阴影；不用玻璃拟态/大面积 blur。

## 响应式

| 断点 | 布局 |
|---|---|
| ≥ 1041px | Hero 7 栏 + sticky 机器人 5 栏；2×2 纸面笔记 |
| 761–1040px | Hero 全宽；问候卡 + 机器人左右并排；笔记全宽 |
| ≤ 760px | 单列：Hero → 问候卡 → 机器人 → 笔记 |
| ≤ 460px | 更紧的 Hero 间距；单行 eyebrow；顶部控件精简 |

实测 320–1920 无横向滚动。

## 文件结构

```text
/
├─ index.html                 # 首页（v6）
├─ 404.html                   # 404（仍使用 v5 的 style.css / error-v5.css）
├─ assets/
│  ├─ css/
│  │  ├─ fonts.css            # 自托管字体声明
│  │  ├─ v6.css               # 首页样式
│  │  ├─ style.css            # 404 基础样式（保留）
│  │  ├─ error-v5.css         # 404 主题（保留）
│  │  └─ v5.css               # 旧首页样式（保留一个发布周期，避免缓存用户报错）
│  ├─ js/
│  │  ├─ v6.js                # 问候、空闲导演、Muse、注视、状态
│  │  └─ main.js              # 旧首页脚本（保留一个发布周期）
│  ├─ fonts/                  # Archivo / IBM Plex Mono + OFL
│  └─ img/
│     ├─ favicon.svg
│     ├─ apple-touch-icon.png
│     ├─ og-cover-v5.jpg      # 仍是 v5 封面，待重拍
│     ├─ meadow-field-1600.webp / -900.webp
│     ├─ meadow-dusk-900.webp # 404 场景
│     ├─ grain.svg
│     └─ contours.svg
├─ _headers                   # Cloudflare Pages 安全头与缓存
├─ _redirects
├─ robots.txt
├─ sitemap.xml
└─ site.webmanifest
```

## 部署

当前仓库已接入 Cloudflare Pages：推送到 `main` 会自动构建并发布。

1. GitHub 推送 `main`。
2. Cloudflare Dashboard → Workers & Pages → `mydomains-merobot` → Deployments 查看构建。
3. Framework preset 选 `None`；Build command 留空；Build output directory 填 `/`。
4. 首次配置时在 Custom domains 添加 `merobot.org` 和 `www.merobot.org`。

也可以手动上传：

```powershell
npx wrangler pages deploy . --project-name=mydomains-merobot
```

> 6.js 使用 data-cfasync="alse" 退出 Cloudflare Rocket Loader，避免脚本被改写类型/延迟执行。不要移除这个属性。_headers、_redirects、404.html 会被 Cloudflare Pages 自动识别。安全响应头包含 CSP；目前已允许 Cloudflare Web Analytics 的脚本与上报域名。新增其他第三方脚本、分析或嵌入内容时，需要同步调整 CSP。若 Cloudflare 的 Email Address Obfuscation 或 Rocket Loader 会向页面注入脚本，上线前请关闭或把对应域名加入 CSP。

## 上线前 / 待替换

- [ ] 确认 `hello@merobot.org` 可用；全站 4 处 mailto。
- [ ] 四则笔记的标题与一句话描述仍是占位内容，替换为真实方向。
- [ ] `og-cover-v5.jpg` 仍是 v5 封面，建议按 v6 首屏重拍 1200×630。
- [ ] 404 仍是 v5 语言；可在下一轮按 v6 重做。
- [ ] 在 https://merobot.org/ 验证 HTTPS、404、OG 预览与移动端。
- [ ] 用 Lighthouse 跑 Performance / Accessibility / Best Practices / SEO。

## 回滚

上一个稳定版本有 Git 标签 `v5-open-field`：

```powershell
git revert <v6-commit>
git push origin main
```

或：

```powershell
git reset --hard v5-open-field
git push --force-with-lease origin main
```

## 视觉素材

页面所有视觉素材均为本站原创：机器人、草甸、favicon、404 场景、社交分享图与版式。没有使用照片、外部插画或第三方图片。字体为 SIL OFL（Archivo、IBM Plex Mono），许可见 `assets/fonts/`。
