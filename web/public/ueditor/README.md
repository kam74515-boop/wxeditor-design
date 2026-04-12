# UEditor 静态资源

本项目使用 UEditor 作为富文本编辑器。

## 安装步骤

### 方式一：使用 npm 安装（推荐）

```bash
cd web
npm install ueditor --save
```

然后将 node_modules/ueditor/dist 目录下的文件复制到 public/ueditor：

```bash
cp -r node_modules/ueditor/dist/* public/ueditor/
```

### 方式二：直接下载

1. 访问 [UEditor 官网](https://ueditor.baidu.com/) 下载最新版本
2. 解压后将 `utf8-jsp` 版本的文件复制到 `public/ueditor` 目录

### 方式三：使用 CDN（开发环境）

在 `vite.config.ts` 中配置 CDN：

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    'process.env.VITE_UE_CDN_URL': JSON.stringify('https://cdn.jsdelivr.net/npm/ueditor@1.6.3/dist')
  }
})
```

## 所需文件

确保 public/ueditor 目录包含以下文件：

```
public/ueditor/
├── ueditor.config.js      # 配置文件
├── ueditor.all.min.js     # 核心文件（必需）
├── ueditor.parse.js       # 内容解析（可选）
├── lang/zh-cn/zh-cn.js    # 中文语言包
└── themes/
    └── default/
        └── css/
            └── ueditor.css  # 默认主题
```

## 微信公众号适配

由于微信公众号对 HTML 有严格限制，建议：

1. 使用 `sanitizeForWechat()` 函数净化输出 HTML
2. 避免使用复杂 CSS 和 JavaScript
3. 图片使用 HTTPS 链接
4. 音频视频使用微信支持的格式

## 预览

编辑器初始化后，可以访问 `/editor` 路由查看效果。