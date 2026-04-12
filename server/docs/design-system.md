# 便利贴 + 波普艺术设计系统

## 概述

本文档定义了微信编辑器 SaaS 应用的视觉设计系统，采用**便利贴**色系结合**波普艺术**风格。

## 设计原则

### 核心理念
1. **直角设计** - 所有元素使用 0 圆角，呈现硬朗的边缘感
2. **硬边阴影** - 使用实色阴影而非柔和的模糊阴影
3. **大胆配色** - 便利贴的柔和色彩与波普艺术的强烈对比
4. **网格布局** - 类似便利贴贴在板上的感觉

### 视觉层级
1. **底层** - 白色或浅灰背景（提供干净的画布）
2. **容器** - 便利贴色卡片（承载内容）
3. **强调** - 黑色边框和文字（引导视觉）
4. **交互** - 波普艺术元素（按钮、图标）

---

## 色彩系统

### 便利贴色系（主色）

| 名称 | 色值 | 用途 |
|------|------|------|
| 便利贴黄 | `#FFF9C4` | 主要容器背景、信息提示 |
| 便利贴粉 | `#FFD1DC` | 次要容器、女性化元素 |
| 便利贴蓝 | `#D4E6FF` | 信息类容器、链接 |
| 便利贴绿 | `#C9F7D1` | 成功状态、积极反馈 |
| 便利贴橙 | `#FFE5B4` | 警告、注意提示 |
| 便利贴紫 | `#E8D5FF` | 特殊功能、高级会员 |

### 波普艺术色系（强调色）

| 名称 | 色值 | 用途 |
|------|------|------|
| 波普黑 | `#000000` | 边框、文字、阴影 |
| 波普红 | `#FF3B30` | 错误、删除、重要按钮 |
| 波普蓝 | `#2962FF` | 链接、选中状态 |
| 波普黄 | `#FFD600` | 高亮、星标 |

### 中性色

| 名称 | 色值 | 用途 |
|------|------|------|
| 白色 | `#FFFFFF` | 背景、卡片内部 |
| 浅灰 | `#F5F5F5` | 次要背景 |
| 中灰 | `#9CA3AF` | 禁用状态 |
| 深灰 | `#475569` | 深色模式背景 |

### 深色模式

| 名称 | 亮模式色值 | 暗模式色值 |
|------|-----------|-----------|
| 背景 | `#FFFFFF` | `#0F172A` |
| 卡片 | 便利贴色 | 调暗 20% |
| 边框 | `#000000` | `#FFFFFF` |
| 文字 | `#1E293B` | `#F1F5F9` |

---

## 字体系统

### 字体族
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### 字体大小

| 名称 | 大小 | 行高 | 用途 |
|------|------|------|------|
| 超大标题 | 48px | 1.1 | 营销页面主标题 |
| 大标题 | 32px | 1.2 | 页面标题 |
| 中标题 | 24px | 1.3 | 区块标题 |
| 小标题 | 18px | 1.4 | 卡片标题 |
| 正文 | 16px | 1.6 | 常规文本 |
| 小字 | 14px | 1.5 | 辅助文本 |
| 微字 | 12px | 1.4 | 标签、时间戳 |

### 字重

| 名称 | 字重 | 用途 |
|------|------|------|
| 常规 | 400 | 正文 |
| 中等 | 500 | 小标题 |
| 粗体 | 700 | 大标题、按钮 |
| 特粗 | 900 | 营销重点 |

---

## 间距系统

### 基础单位
基础间距单位为 `4px`

### 间距比例

| 名称 | 值 | 用途 |
|------|------|------|
| xs | 4px | 紧凑元素间距 |
| sm | 8px | 小间距 |
| md | 16px | 中等间距 |
| lg | 24px | 大间距 |
| xl | 32px | 超大间距 |
| 2xl | 48px | 区块间距 |
| 3xl | 64px | 章节间距 |

### 内边距

```css
--padding-sm: 8px;
--padding-md: 16px;
--padding-lg: 24px;
--padding-xl: 32px;
```

---

## 边框系统

### 核心规则
- **所有组件使用直角** (`border-radius: 0`)
- **边框宽度**: 2px（常规）、3px（强调）
- **边框颜色**: 波普黑 (`#000000`)

### 边框样式

```css
/* 常规边框 */
border: 2px solid #000000;

/* 强调边框 */
border: 3px solid #000000;

/* 虚线边框 */
border: 2px dashed #000000;
```

---

## 阴影系统

### 硬边阴影（波普艺术特色）

```css
/* 小阴影 - 向右下偏移 */
--shadow-sm: 2px 2px 0px #000000;

/* 中阴影 */
--shadow-md: 4px 4px 0px #000000;

/* 大阴影 */
--shadow-lg: 6px 6px 0px #000000;

/* 超大阴影 */
--shadow-xl: 8px 8px 0px #000000;

/* 漂浮阴影（用于悬停状态） */
--shadow-float: 8px -4px 0px #000000;
```

### 阴影使用原则
1. 静态元素使用小阴影 (`shadow-sm`)
2. 交互元素使用中阴影 (`shadow-md`)
3. 悬停时阴影变大并上移
4. 弹出层使用大阴影 (`shadow-lg`)

---

## 组件规范

### StickyNote 容器

便利贴风格的核心容器组件。

```vue
<template>
  <div class="sticky-note" :class="[colorClass]">
    <div class="sticky-note__pin"></div>
    <slot />
  </div>
</template>

<style>
.sticky-note {
  position: relative;
  border: 2px solid #000000;
  box-shadow: var(--shadow-md);
  padding: 16px;
  border-radius: 0; /* 直角！ */
}

/* 便利贴颜色变体 */
.sticky-note--yellow { background: #FFF9C4; }
.sticky-note--pink { background: #FFD1DC; }
.sticky-note--blue { background: #D4E6FF; }
.sticky-note--green { background: #C9F7D1; }
.sticky-note--orange { background: #FFE5B4; }
.sticky-note--purple { background: #E8D5FF; }

/* 图钉装饰 */
.sticky-note__pin {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 16px;
  background: #FF3B30;
  border-radius: 50%;
  border: 2px solid #000000;
}
</style>
```

### FlatButton 按钮

波普艺术风格的按钮。

```vue
<template>
  <button class="flat-button" :class="[variant, size]">
    <slot />
  </button>
</template>

<style>
.flat-button {
  border: 2px solid #000000;
  border-radius: 0; /* 直角！ */
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: var(--shadow-sm);
}

/* 变体 */
.flat-button--primary {
  background: #000000;
  color: #FFFFFF;
}

.flat-button--secondary {
  background: #FFFFFF;
  color: #000000;
}

.flat-button--danger {
  background: #FF3B30;
  color: #FFFFFF;
}

/* 尺寸 */
.flat-button--sm { padding: 8px 16px; font-size: 14px; }
.flat-button--md { padding: 12px 24px; font-size: 16px; }
.flat-button--lg { padding: 16px 32px; font-size: 18px; }

/* 悬停效果 */
.flat-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}

.flat-button:active {
  transform: translate(0, 0);
  box-shadow: var(--shadow-sm);
}
</style>
```

### PopCard 卡片

带有波普艺术元素的卡片。

```vue
<template>
  <div class="pop-card">
    <div class="pop-card__header" v-if="$slots.header">
      <slot name="header" />
    </div>
    <div class="pop-card__body">
      <slot />
    </div>
    <div class="pop-card__footer" v-if="$slots.footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style>
.pop-card {
  background: #FFFFFF;
  border: 3px solid #000000;
  box-shadow: var(--shadow-lg);
  border-radius: 0; /* 直角！ */
}

.pop-card__header {
  padding: 16px;
  border-bottom: 2px solid #000000;
  font-weight: 700;
}

.pop-card__body {
  padding: 16px;
}

.pop-card__footer {
  padding: 16px;
  border-top: 2px solid #000000;
  display: flex;
  gap: 8px;
}
</style>
```

### PaperInput 输入框

纸张风格的输入框。

```vue
<template>
  <div class="paper-input">
    <label class="paper-input__label" v-if="label">{{ label }}</label>
    <input 
      class="paper-input__field"
      :type="type"
      :placeholder="placeholder"
    />
  </div>
</template>

<style>
.paper-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.paper-input__label {
  font-weight: 600;
  font-size: 14px;
}

.paper-input__field {
  border: 2px solid #000000;
  border-radius: 0; /* 直角！ */
  padding: 12px;
  font-size: 16px;
  background: #FFFEF5; /* 微黄的纸张色 */
  box-shadow: var(--shadow-sm);
}

.paper-input__field:focus {
  outline: none;
  box-shadow: var(--shadow-md);
}

.paper-input__field::placeholder {
  color: #9CA3AF;
}
</style>
```

---

## 图标系统

### 推荐图标风格
- 线性图标，2px 描边
- 方形而非圆形背景
- 黑白为主，强调色点缀

### 图标尺寸
- 小: 16px
- 中: 24px
- 大: 32px

---

## 动效系统

### 过渡时长

| 名称 | 时长 | 用途 |
|------|------|------|
| 快 | 100ms | 按钮、开关 |
| 中 | 200ms | 卡片展开、抽屉 |
| 慢 | 300ms | 页面过渡、大型动画 |

### 缓动函数
```css
/* 波普艺术风格 - 急停急动 */
--ease-pop: cubic-bezier(0.68, -0.55, 0.27, 1.55);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 常用动效
1. **悬停上浮**: `transform: translate(-2px, -2px)` + 阴影增大
2. **点击下沉**: `transform: translate(0, 0)` + 阴影缩小
3. **波普弹跳**: 使用 `--ease-bounce` 缓动函数

---

## 半调网点背景

波普艺术标志性元素。

```css
.halftone-bg {
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 4px 4px;
}

/* 浅色版本 */
.halftone-bg--light {
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 6px 6px;
  opacity: 0.1;
}
```

---

## 漫画对话气泡

用于提示、通知等。

```css
.speech-bubble {
  position: relative;
  background: #FFFFFF;
  border: 2px solid #000000;
  padding: 12px;
  border-radius: 0;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 20px;
  width: 0;
  height: 0;
  border: 10px solid transparent;
  border-top-color: #000000;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 22px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-top-color: #FFFFFF;
  z-index: 1;
}
```

---

## 响应式断点

```css
/* 移动端优先 */
--breakpoint-sm: 640px;  /* 平板 */
--breakpoint-md: 768px;  /* 小桌面 */
--breakpoint-lg: 1024px; /* 桌面 */
--breakpoint-xl: 1280px; /* 大桌面 */
```

---

## 无障碍设计

1. **对比度**: 文字与背景对比度至少 4.5:1
2. **焦点状态**: 明显的焦点环（黑色实线边框）
3. **触摸目标**: 最小 44px × 44px
4. **动画偏好**: 尊重 `prefers-reduced-motion`

---

## 设计令

### 必须做的
- [ ] 所有组件使用 `border-radius: 0`
- [ ] 使用便利贴色系作为主色
- [ ] 使用波普黑作为边框色
- [ ] 使用硬边阴影
- [ ] 保持高对比度

### 禁止做的
- [ ] 不要使用圆角
- [ ] 不要使用柔和的模糊阴影
- [ ] 不要使用渐变背景
- [ ] 不要使用过于细腻的颜色
- [ ] 不要使用细边框（最少 2px）

---

## 文件结构

```
web/src/styles/
├── variables.scss    # CSS 变量
├── mixins.scss       # SASS 混入
├── utilities.scss    # 工具类
└── components/       # 组件样式
    ├── sticky-note.scss
    ├── flat-button.scss
    ├── pop-card.scss
    └── paper-input.scss

web/src/components/base/
├── StickyNote.vue
├── FlatButton.vue
├── PopCard.vue
├── PaperInput.vue
└── SpeechBubble.vue
```
