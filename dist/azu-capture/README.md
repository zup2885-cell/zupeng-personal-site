# 阿祖截图

公开网址：https://zup2885-cell.github.io/zupeng-personal-site/azu-capture/

阿祖的浏览器截图与图片收集工具；无需登录。原生 HTML/CSS/JavaScript，无外部字体、分析脚本或上传服务。

## 使用

- 桌面浏览器点击「开始截屏」，在浏览器自己的选择窗口中授权屏幕、窗口或标签页，然后手动截取一帧。截图后或取消时立即停止共享，不请求声音。
- 「开始录屏」用同一套屏幕共享录下画面（不录音）。停止后拖动开始和结束，下载 WebM。剪辑在本机完成，不进入收集盒，也不上传。推荐桌面 Chrome / Edge。
- 拖动框选裁剪范围，保存到收集盒。已有图片裁剪会生成副本，保留原图。
- 可以导入、拖入或粘贴 PNG / JPEG / WebP / GIF / AVIF / BMP，统一保存为 PNG；动态图只取首帧。
- 图片保存于当前浏览器的 IndexedDB。存储不可用时明确提示临时模式；清除网站数据会清空图片，需自行导出备份。
- 支持单张复制 / PNG 下载，以及多选 ZIP 打包。移除后可撤销。
- 手机可导入、裁剪与下载。在线屏幕捕获取决于浏览器支持和操作系统权限，推荐桌面 Chrome / Edge。网页不提供系统全局快捷键或后台自动监控截图。

## Mac 下载

`downloads/ClipShelf-Mac-1.4.0.zip` 是阿祖之前的「截图收集盒」1.4.0 归档包，来自本仓库提交 `5a4ff8b8f917db23c4c64023340e1460d7648ec7` 的 `public/secret-weapons/downloads/shelf-mac.zip`。

- SHA-256：`ed0647cfaab091718275b531e38cd90871d1fbaf84f553522598bcfffd895712`
- Bundle ID：`local.azu.clipshelf`
- Apple Silicon，macOS 13+；原应用名、内容及签名保持原样，未将第三方应用冒充为阿祖的作品。
- 归档仅包含应用和 macOS 资源元数据，不含用户截图、记录、凭据。
- 未做 Developer ID 公证，其他电脑安装未验证；网页与 Mac 应用不自动同步数据。

## 本地开发与发布

本目录位于正式网站的 `public/azu-capture/`。本地可运行静态 HTTP 服务；Vite 开发预览请使用 `/azu-capture/index.html`。运行根目录 `npm run build` 后，Vite 会复制此目录到 `dist/azu-capture/`。

GitHub Pages 发布 `dist/`。仅在阿祖明确授权时提交、推送源码及对应构建产物，不启用定时部署。

## 验证记录

- 裁剪坐标（反向拖动、边界限制）、CRC32、ZIP 文件名测试通过；导出的 ZIP 用 Python 标准库独立验证文件名、内容与校验和。
- 浏览器实际验证：示例图片框选、保存、刷新保留、多选、移除和撤销、打包按钮反馈；390px 手机布局无横向溢出。
- 内置浏览器的原生屏幕选择器无法由当前自动化界面操作，完整屏幕采集及系统权限流程未完成自动实测；不绕过浏览器或系统授权。
- Mac 归档完整性与来源哈希已核对，本次未重新安装运行。

API 依据：[Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)、[Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write)。
