# merobot.org

MEROBOT 的单页英文官网。v5 视觉方向是 **“Open Field / 开放田野”**：整页是一幅可呼吸的原创草甸，天空、雾气、鸟群、草叶和光缓慢运动；标题、机器人与四张 field note 漂浮在景观之上，而不是被装进一个画框里。

当前状态：**已部署到 Cloudflare Pages（2026-11-21）。**

- 线上地址：https://merobot.org
- GitHub：https://github.com/bjsffxcwh/MyDomains_merobot
- Cloudflare Pages 项目：`mydomains-merobot`（Production 分支 `main`）

## 本地预览

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/`。

## 交互

- 全页环境：草甸缓慢推近、云雾漂移、鸟群掠过、草叶摆动、花粉光点漂浮；鼠标移动时背景与机器人产生轻微视差。
- 机器人待命：呼吸式浮动、地面阴影、随机眨眼；围巾、肩头植物和手里的鸟持续轻动。
- 鼠标移动：头部微微转动，眼睛跟随光标。
- 悬停或聚焦任一轨道卡/顶部 tab，机器人切换对应表情与动作：
  - Research：抬头观察，出现叶片放大镜与萤火；
  - Education：开心，学士帽落下；
  - Projects：兴奋，抬臂挥手，纸飞机起飞；
  - Solutions：眨眼，纸灯笼亮起。
- 点击卡片或顶部 tab 可锁定状态；再次点击或按 `Esc` 取消。
- 支持键盘焦点、`prefers-reduced-motion`、移动端点击。
- 1440×900、1366×768、1024×768 下保持单屏；窄屏自动切换为可滚动布局。

## 视觉规范

- **概念**：自然与机械共存的开放田野。机器人、草甸、版式与交互均为原创。
- **背景**：由站内原创矢量草甸底稿重绘的手绘景观，以全屏 fixed 场景承载内容；叠加程序化草叶、云雾、鸟群和光点动画，不使用照片或外部插画。
- **字体**：Archivo（可变宽度，硬朗无衬线）+ IBM Plex Mono（标签/数据）。正文与卡片描述已整体放大，最低信息字号为 9–10px。
- **颜色**：冷调米白 `#eef3ed`、墨绿 `#1b2f26`、珊瑚 `#d35f3e`、雾蓝 `#78aebb`、苔藓 `#6f947c`；去掉大面积暖黄纸色。
- **版式**：不对称 hero（左侧标题、右侧大机器人）+ 横向四张 field note + 单行 Lab index；卡片带极轻的错位与旋转，悬停时归正、抬起并显示彩色顶线。
- **纹理**：纸张颗粒、手绘笔触与柔和景深；全部本地资源，无第三方运行时请求。

## 文件结构

```text
/
├─ index.html                 # 首页（全屏景观、机器人、四张 field note）
├─ 404.html                   # 404 页面（“Off the map.”）
├─ assets/
│  ├─ css/fonts.css           # 自托管字体声明
│  ├─ css/style.css           # 基础设计系统、机器人动画、404 基础样式
│  ├─ css/v5.css              # v5 首页布局、全屏景观、卡片与响应式
│  ├─ css/error-v5.css        # 404 的 v5 冷色主题
│  ├─ js/main.js              # 机器人状态、鼠标追踪、锁定与背景视差
│  ├─ fonts/                  # Archivo / IBM Plex Mono + OFL
│  └─ img/
│     ├─ favicon.svg
│     ├─ apple-touch-icon.png
│     ├─ og-cover-v5.jpg      # 1200×630 分享图
│     ├─ meadow-field-1600.webp / meadow-field-900.webp
│     ├─ meadow-dusk-900.webp # 404 的暮色草甸
│     ├─ grain.svg            # 纸张颗粒
│     └─ contours.svg         # 等高线纹理（基础 CSS 回退）
├─ _headers                   # Cloudflare Pages 安全响应头与缓存
├─ _redirects                 # /index.html → /
├─ robots.txt
├─ sitemap.xml
└─ site.webmanifest
```

## 画面说明

页面所有视觉素材均为本站原创：机器人、草甸、favicon、404 场景、社交分享图与版式。没有使用照片、外部插画或第三方图片。

## 待确认 / 替换清单

1. **联系邮箱**：目前使用 `hello@merobot.org`，请确认可用；全站共 4 处 mailto。
2. **品牌文案**：`MEROBOT`、`Field robotics lab`、首页标题与简介目前为拟定文案。
3. **四张卡片**：标题和一句话描述为占位内容，需替换为真实方向。
4. **底部四个入口**：Notes / Publications / Resources 当前标注 `Soon` 且不可点击；Collaborate 指向邮箱。
5. **页脚年份**：当前为 `© 2026`。
6. **社交链接**：首版未放 GitHub / LinkedIn / X，避免空链接。

文案集中在 `index.html`；颜色、字体、间距集中在 `assets/css/v5.css` 顶部 `:root`。 `assets/css/style.css` 保留机器人、字体和 404 的基础样式，v5 页面样式以 `v5.css` 为准。

## 部署到 Cloudflare Pages

当前仓库已接入 Cloudflare Pages：推送到 `main` 会自动构建并发布。首次配置或迁移时：

1. 创建 GitHub 仓库并推送本项目（分支 `main`）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库，Framework preset 选 `None`。
4. Build command 留空；Build output directory 填 `/`（项目根目录）。
5. 保存并部署。首次部署后，在 Custom domains 添加 `merobot.org` 和 `www.merobot.org`。
6. 域名已在 Cloudflare 托管时，按提示创建/保留代理记录；不要删除现有 mail 相关 MX/TXT 记录。

也可以不用 Git，直接上传：

```powershell
npx wrangler pages deploy . --project-name=mydomains-merobot
```

> `_headers`、`_redirects`、`404.html` 会被 Cloudflare Pages 自动识别。安全响应头包含 CSP；目前已允许 Cloudflare Web Analytics 的脚本与上报域名。新增其他第三方脚本、分析或嵌入内容时，需要同步调整 CSP。若 Cloudflare 的 Email Address Obfuscation 或 Rocket Loader 会向页面注入脚本，上线前请关闭或把对应域名加入 CSP。

## 上线前检查

- [ ] 替换并验证联系邮箱
- [ ] 替换四张卡片与首页文案
- [ ] 确认底部四个模块的去向
- [ ] 检查 `sitemap.xml` 中的日期
- [ ] 在 `https://merobot.org/` 验证 HTTPS、404、OG 预览与移动端
- [ ] 用 Lighthouse 跑一次 Performance / Accessibility / Best Practices / SEO
