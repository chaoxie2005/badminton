# 羽球局 · Badminton

羽毛球球友社区，包含两个版本：

```
miniprogram/ + cloudfunctions/   微信小程序（原生 + 云开发），第一版原型
web/                             Web 版（Next.js + Supabase），目前的主线
```

## Web 版（推荐）

手机计分 + 投影大屏，浏览器打开即用，无需安装，不需要服务器。

- 完整实现：邮箱/游客登录、记分牌、红黄牌、撤回、局分与发球权自动结算、实时大屏、操作记录、论坛（含图片帖）
- 下一阶段：伤病科普、手机号登录、视频与 AI 动作分析
- 技术栈：Next.js 16 / Tailwind v4 / Supabase（Auth + Postgres）

```bash
cd web
npm install
npm run dev        # 零配置即可运行本地模式
```

详见 [web/README.md](web/README.md)。

## 小程序版

保留作为产品原型与需求参考，功能：记分牌、论坛、个人中心、伤病科普列表。

用微信开发者工具打开根目录即可，云开发环境见 `miniprogram/app.js`。
