# 祖朋 · A steady heart. A curious soul.

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

采用用户提供的 Serene 模板：全屏地球视频、衬线大标题、固定导航、移动端抽屉菜单、海蓝渐变和彩虹云层滚动视差。结合 mux3.mp4 中的暗色立体卡片，增加可拖动、键盘切换和暂停的照片画廊。减少动态效果系统偏好会暂停背景视频和自动旋转、关闭视差。

飞书正文根据 `src/content-checklist.json` 的 55 项逐项核对，姓名按本人要求使用“祖朋”。保留 14 张原文图片和 2 段军旅视频。照片支持打开完整原图；完整图文在引言与画廊之后。

模板所附视频没有音轨，因此首页控制的是视频播放/暂停。

## 素材来源

- 飞书原文：https://my.feishu.cn/docx/PAUidcBMUoMoutxaVZOc7zPWnPb
- 地球背景、彩虹和云层：用户粘贴模板所提供的原始素材；地球视频经压缩以改善加载。
- 卡片动效参考：用户提供的 mux3.mp4。
