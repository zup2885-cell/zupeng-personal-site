# 祖朋 · 认真做事，自由生活

React + Vite + TypeScript + Tailwind CSS 个人网站，发布到 GitHub Pages。

## 开发

```sh
npm ci
npm run dev
npm run build
npm run preview
```

源码位于 `src/`，原始照片、视频和装饰素材位于 `public/assets/`，构建产物位于 `dist/`。
推送 `main` 后 GitHub Actions 发布 `dist/`，修改后须先运行 `npm run build`。

## 本版设计

首页进一步对齐用户的 mux3.mp4 参考：黑蓝底色、居中标题、主题选择、金属星形点缀与首屏弧形立体照片带。采用连续逐帧运动，支持拖动惯性、吸附、键盘切换和暂停；主题按钮联动照片与章节链接。地球视频成为低亮度背景，随后衔接海蓝渐变和彩虹云层视差。减少动态效果系统偏好会暂停背景视频和自动滑动、关闭视差；页面不可见时停止动画和背景视频。

飞书正文根据 `src/content-checklist.json` 的 55 项逐项核对，姓名按本人要求使用“祖朋”。保留 14 张原文图片和 2 段军旅视频。照片支持打开完整原图；完整图文在引言与画廊之后。

模板所附视频没有音轨，首页动态开关统一控制背景视频和卡片自动滑动。

## 素材来源

- 飞书原文：https://my.feishu.cn/docx/PAUidcBMUoMoutxaVZOc7zPWnPb
- 地球背景、彩虹和云层：用户粘贴模板所提供的原始素材；地球视频经压缩以改善加载。
- 卡片动效参考：用户提供的 mux3.mp4。
