/**
 * 自定义颜色选择器模块
 * 完全替代 UEditor 原生 ColorPicker，提供现代化的颜色选择体验
 * 功能：色相/饱和度面板、色相条、透明度条、RGB 输入、调色板、文章色卡、吸色器
 */

// ========== 工具函数 ==========

/** HSV 转 RGB */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** RGB 转 HSV */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v];
}

/** RGB 转 Hex */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** Hex 转 RGB */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** 解析任意颜色字符串 */
function parseColor(color: string): [number, number, number] | null {
  if (!color || color === 'default' || color === 'transparent') return null;
  // hex
  const hex = hexToRgb(color);
  if (hex) return hex;
  // rgb(r, g, b)
  const m = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

// ========== 调色板存储 ==========
const PALETTE_KEY = 'wxeditor-color-palette';
function loadPalette(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PALETTE_KEY) || '[]');
  } catch { return []; }
}
function savePalette(colors: string[]) {
  localStorage.setItem(PALETTE_KEY, JSON.stringify(colors.slice(0, 20)));
}

// ========== 文章色卡提取 ==========
function extractArticleColors(editor: any): string[] {
  const colors = new Set<string>();
  try {
    const body = editor.body;
    if (!body) return [];
    const elements = body.querySelectorAll('*');
    elements.forEach((el: HTMLElement) => {
      const color = el.style.color;
      const bg = el.style.backgroundColor;
      if (color && color !== 'rgb(0, 0, 0)' && color !== 'black' && color !== 'transparent') {
        const parsed = parseColor(color);
        if (parsed) colors.add(rgbToHex(...parsed));
      }
      if (bg && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)' && bg !== 'white') {
        const parsed = parseColor(bg);
        if (parsed) colors.add(rgbToHex(...parsed));
      }
    });
  } catch (e) { /* 忽略 */ }
  return Array.from(colors).slice(0, 16);
}

// ========== 颜色选择器主类 ==========
interface ColorPickerOptions {
  type: 'forecolor' | 'backcolor';
  editor: any;
  anchorEl: HTMLElement;
  onApply: (color: string) => void;
  onClose: () => void;
}

class CustomColorPicker {
  private container: HTMLDivElement;
  private svCanvas!: HTMLCanvasElement;
  private svCtx!: CanvasRenderingContext2D;
  private hueCanvas!: HTMLCanvasElement;
  private hueCtx!: CanvasRenderingContext2D;
  private previewEl!: HTMLDivElement;
  private colorInput!: HTMLInputElement;
  private articleColorsEl!: HTMLDivElement;
  private paletteEl!: HTMLDivElement;

  // 颜色状态
  private hue = 0;       // 0-1
  private sat = 1;       // 0-1
  private val = 1;       // 0-1
  private options: ColorPickerOptions;
  private dragging: 'sv' | 'hue' | null = null;
  private boundClose: (e: MouseEvent) => void;

  constructor(opts: ColorPickerOptions) {
    this.options = opts;
    this.container = document.createElement('div');
    this.container.className = 'wx-color-picker';
    this.boundClose = this.handleOutsideClick.bind(this);
    this.buildUI();
    this.position(opts.anchorEl);
    document.body.appendChild(this.container);
    // 延迟绑定外部点击关闭
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.boundClose);
    });
  }

  // 预设常用颜色网格
  private static PRESET_COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  ];

  private buildUI() {
    const title = this.options.type === 'forecolor' ? '字体颜色' : '背景颜色';
    const iconSvg = this.options.type === 'forecolor'
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/></svg>';

    this.container.innerHTML = `
      <div class="wx-cp-header">
        <span class="wx-cp-header-icon">${iconSvg}</span>
        <span>${title}</span>
      </div>
      <div class="wx-cp-body">
        <div class="wx-cp-picker-area">
          <div class="wx-cp-sv-wrap">
            <canvas class="wx-cp-sv"></canvas>
            <div class="wx-cp-sv-cursor"></div>
          </div>
          <div class="wx-cp-hue-wrap">
            <canvas class="wx-cp-hue"></canvas>
            <div class="wx-cp-hue-cursor"></div>
          </div>
        </div>
        <div class="wx-cp-input-row">
          <div class="wx-cp-preview"></div>
          <input class="wx-cp-color-input" type="text" spellcheck="false" />
          <button class="wx-cp-btn-clear" title="清除颜色">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="wx-cp-section">
          <div class="wx-cp-section-title">常用颜色</div>
          <div class="wx-cp-presets"></div>
        </div>
        <div class="wx-cp-section">
          <div class="wx-cp-section-title">
            <span>文章色卡</span>
            <svg class="wx-cp-section-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M12 2v20"/></svg>
          </div>
          <div class="wx-cp-article-colors"></div>
        </div>
        <div class="wx-cp-section">
          <div class="wx-cp-section-title">调色板</div>
          <div class="wx-cp-palette"></div>
        </div>
        <div class="wx-cp-footer">
          <button class="wx-cp-eyedropper" title="吸色器">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3L15 6"/></svg>
            <span>吸色</span>
          </button>
          <div class="wx-cp-actions">
            <button class="wx-cp-btn-save">+ 调色板</button>
            <button class="wx-cp-btn-apply">应用颜色</button>
          </div>
        </div>
      </div>
    `;

    // 获取引用
    this.svCanvas = this.container.querySelector('.wx-cp-sv')!;
    // 设置高DPI canvas 尺寸
    const dpr = window.devicePixelRatio || 1;
    const svW = 216, svH = 140, hueW = 28, hueH = 140;
    this.svCanvas.width = svW * dpr;
    this.svCanvas.height = svH * dpr;
    this.svCanvas.style.width = svW + 'px';
    this.svCanvas.style.height = svH + 'px';
    this.svCtx = this.svCanvas.getContext('2d')!;
    this.svCtx.scale(dpr, dpr);

    this.hueCanvas = this.container.querySelector('.wx-cp-hue')!;
    this.hueCanvas.width = hueW * dpr;
    this.hueCanvas.height = hueH * dpr;
    this.hueCanvas.style.width = hueW + 'px';
    this.hueCanvas.style.height = hueH + 'px';
    this.hueCtx = this.hueCanvas.getContext('2d')!;
    this.hueCtx.scale(dpr, dpr);
    this.previewEl = this.container.querySelector('.wx-cp-preview')!;
    this.colorInput = this.container.querySelector('.wx-cp-color-input')!;
    this.articleColorsEl = this.container.querySelector('.wx-cp-article-colors')!;
    this.paletteEl = this.container.querySelector('.wx-cp-palette')!;

    // 绘制
    this.drawHue();
    this.drawSV();
    this.updateDisplay();

    // 事件绑定
    this.bindSVEvents();
    this.bindHueEvents();
    this.bindInputEvents();
    this.bindButtons();
    this.renderPresets();
    this.renderArticleColors();
    this.renderPalette();
  }

  // ===== 色相条绘制 =====
  private drawHue() {
    const ctx = this.hueCtx;
    const w = 28, h = 140; // 逻辑像素
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const stops = ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'];
    stops.forEach((color, i) => grad.addColorStop(i / (stops.length - 1), color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ===== 饱和度/亮度面板绘制 =====
  private drawSV() {
    const ctx = this.svCtx;
    const w = 216, h = 140; // 逻辑像素
    const [r, g, b] = hsvToRgb(this.hue, 1, 1);
    // 水平白色渐变
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);
    // 垂直黑色渐变
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // ===== 渲染预设颜色 =====
  private renderPresets() {
    const presetsEl = this.container.querySelector('.wx-cp-presets')!;
    presetsEl.innerHTML = CustomColorPicker.PRESET_COLORS.map(c =>
      `<div class="wx-cp-preset" style="background:${c}" data-color="${c}" title="${c}"></div>`
    ).join('');
    presetsEl.querySelectorAll('.wx-cp-preset').forEach(el => {
      el.addEventListener('click', () => {
        const color = (el as HTMLElement).dataset.color!;
        const rgb = hexToRgb(color);
        if (rgb) {
          const [h, s, v] = rgbToHsv(...rgb);
          this.hue = h; this.sat = s; this.val = v;
          this.drawSV();
          this.updateDisplay();
        }
      });
    });
  }

  // ===== 更新显示 =====
  private updateDisplay() {
    const [r, g, b] = hsvToRgb(this.hue, this.sat, this.val);
    const hex = rgbToHex(r, g, b);
    this.previewEl.style.backgroundColor = hex;
    this.colorInput.value = hex;

    // 更新 SV 光标位置
    const svCursor = this.container.querySelector('.wx-cp-sv-cursor') as HTMLElement;
    svCursor.style.left = `${this.sat * 216}px`;
    svCursor.style.top = `${(1 - this.val) * 140}px`;
    svCursor.style.borderColor = this.val > 0.5 ? '#333' : '#fff';

    // 更新色相光标位置
    const hueCursor = this.container.querySelector('.wx-cp-hue-cursor') as HTMLElement;
    hueCursor.style.top = `${this.hue * 140}px`;
  }

  // ===== SV 面板事件 =====
  private bindSVEvents() {
    const handleSV = (e: MouseEvent) => {
      const rect = this.svCanvas.getBoundingClientRect();
      this.sat = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.val = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      this.updateDisplay();
    };
    this.svCanvas.addEventListener('mousedown', (e) => {
      this.dragging = 'sv';
      handleSV(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (this.dragging === 'sv') handleSV(e);
    });
    document.addEventListener('mouseup', () => {
      if (this.dragging === 'sv') this.dragging = null;
    });
  }

  // ===== 色相条事件 =====
  private bindHueEvents() {
    const handleHue = (e: MouseEvent) => {
      const rect = this.hueCanvas.getBoundingClientRect();
      this.hue = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      this.drawSV();
      this.updateDisplay();
    };
    this.hueCanvas.addEventListener('mousedown', (e) => {
      this.dragging = 'hue';
      handleHue(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (this.dragging === 'hue') handleHue(e);
    });
    document.addEventListener('mouseup', () => {
      if (this.dragging === 'hue') this.dragging = null;
    });
  }

  // ===== 输入框事件 =====
  private bindInputEvents() {
    this.colorInput.addEventListener('change', () => {
      let val = this.colorInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      const rgb = hexToRgb(val);
      if (rgb) {
        const [h, s, v] = rgbToHsv(...rgb);
        this.hue = h; this.sat = s; this.val = v;
        this.drawSV();
        this.updateDisplay();
      }
    });
  }

  // ===== 按钮事件 =====
  private bindButtons() {
    // 应用颜色
    this.container.querySelector('.wx-cp-btn-apply')!.addEventListener('click', () => {
      const [r, g, b] = hsvToRgb(this.hue, this.sat, this.val);
      this.options.onApply(rgbToHex(r, g, b));
      this.destroy();
    });

    // 清除颜色
    this.container.querySelector('.wx-cp-btn-clear')!.addEventListener('click', () => {
      this.options.onApply('default');
      this.destroy();
    });

    // 加入调色板
    this.container.querySelector('.wx-cp-btn-save')!.addEventListener('click', () => {
      const [r, g, b] = hsvToRgb(this.hue, this.sat, this.val);
      const hex = rgbToHex(r, g, b);
      const palette = loadPalette();
      if (!palette.includes(hex)) {
        palette.unshift(hex);
        savePalette(palette);
        this.renderPalette();
      }
    });

    // 吸色器
    this.container.querySelector('.wx-cp-eyedropper')!.addEventListener('click', async () => {
      try {
        // @ts-ignore - EyeDropper API
        if (window.EyeDropper) {
          // @ts-ignore
          const dropper = new window.EyeDropper();
          const result = await dropper.open();
          const rgb = hexToRgb(result.sRGBHex);
          if (rgb) {
            const [h, s, v] = rgbToHsv(...rgb);
            this.hue = h; this.sat = s; this.val = v;
            this.drawSV();
            this.updateDisplay();
          }
        } else {
          alert('您的浏览器不支持吸色器功能，请使用 Chrome 或 Edge。');
        }
      } catch (e) {
        // 用户取消
      }
    });
  }

  // ===== 文章色卡 =====
  private renderArticleColors() {
    const colors = extractArticleColors(this.options.editor);
    if (colors.length === 0) {
      this.articleColorsEl.innerHTML = '<span class="wx-cp-empty">暂无颜色</span>';
      return;
    }
    this.articleColorsEl.innerHTML = colors.map(c =>
      `<div class="wx-cp-swatch" style="background:${c}" data-color="${c}" title="${c}"></div>`
    ).join('');
    this.articleColorsEl.querySelectorAll('.wx-cp-swatch').forEach(el => {
      el.addEventListener('click', () => {
        const color = (el as HTMLElement).dataset.color!;
        const rgb = hexToRgb(color);
        if (rgb) {
          const [h, s, v] = rgbToHsv(...rgb);
          this.hue = h; this.sat = s; this.val = v;
          this.drawSV();
          this.updateDisplay();
        }
      });
    });
  }

  // ===== 调色板 =====
  private renderPalette() {
    const colors = loadPalette();
    if (colors.length === 0) {
      this.paletteEl.innerHTML = '<span class="wx-cp-empty">暂无色板</span>';
      return;
    }
    this.paletteEl.innerHTML = colors.map(c =>
      `<div class="wx-cp-swatch wx-cp-palette-swatch" style="background:${c}" data-color="${c}" title="${c} (右键删除)"></div>`
    ).join('');
    this.paletteEl.querySelectorAll('.wx-cp-palette-swatch').forEach(el => {
      // 左键选色
      el.addEventListener('click', () => {
        const color = (el as HTMLElement).dataset.color!;
        const rgb = hexToRgb(color);
        if (rgb) {
          const [h, s, v] = rgbToHsv(...rgb);
          this.hue = h; this.sat = s; this.val = v;
          this.drawSV();
          this.updateDisplay();
        }
      });
      // 右键删除
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const color = (el as HTMLElement).dataset.color!;
        const palette = loadPalette().filter(c => c !== color);
        savePalette(palette);
        this.renderPalette();
      });
    });
  }

  // ===== 定位 =====
  private position(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const panelW = 268;
    const panelH = 480;
    let left = rect.left;
    let top = rect.bottom + 4;
    // 防止超出视口
    if (left + panelW > window.innerWidth) left = window.innerWidth - panelW - 8;
    if (top + panelH > window.innerHeight) top = rect.top - panelH - 4;
    if (left < 0) left = 8;
    if (top < 0) top = 8;
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  // ===== 外部点击关闭 =====
  private handleOutsideClick(e: MouseEvent) {
    if (!this.container.contains(e.target as Node)) {
      this.destroy();
    }
  }

  // ===== 设置初始颜色 =====
  setColor(color: string) {
    const rgb = parseColor(color);
    if (rgb) {
      const [h, s, v] = rgbToHsv(...rgb);
      this.hue = h; this.sat = s; this.val = v;
      this.drawSV();
      this.updateDisplay();
    }
  }

  // ===== 销毁 =====
  destroy() {
    document.removeEventListener('mousedown', this.boundClose);
    this.container.remove();
    this.options.onClose();
  }
}

// ========== 对外 API ==========

let activePickerInstance: CustomColorPicker | null = null;

/**
 * 注入自定义颜色选择器到 UEditor 工具栏
 * 接管字体颜色和背景颜色按钮的下拉行为
 */
export function injectCustomColorPicker(editor: any) {
  // 等待工具栏渲染完成
  setTimeout(() => {
    const toolbar = document.querySelector('.edui-toolbar');
    if (!toolbar) return;

    ['forecolor', 'backcolor'].forEach(type => {
      const wrapper = toolbar.querySelector(`.edui-for-${type}`) as HTMLElement;
      if (!wrapper) return;

      // 替换 SVG 图标 - forecolor: 字母A+色条, backcolor: 油漆桶+色条
      const iconEl = wrapper.querySelector('.edui-icon') as HTMLElement;
      if (iconEl) {
        iconEl.style.backgroundImage = 'none';
        iconEl.innerHTML = type === 'forecolor'
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/></svg>';
        iconEl.style.display = 'flex';
        iconEl.style.alignItems = 'center';
        iconEl.style.justifyContent = 'center';
      }

      // 拦截下拉箭头点击
      const arrowEl = wrapper.querySelector('.edui-arrow') as HTMLElement;
      if (arrowEl) {
        // 克隆替换以移除原有事件
        const newArrow = arrowEl.cloneNode(true) as HTMLElement;
        arrowEl.parentNode?.replaceChild(newArrow, arrowEl);

        newArrow.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // 关闭 UEditor 可能已打开的弹出层
          try {
            const popups = document.querySelectorAll('.edui-popup');
            popups.forEach(p => {
              (p as HTMLElement).style.display = 'none';
            });
          } catch (_) { /* 忽略 */ }

          // 如果已有面板打开则关闭
          if (activePickerInstance) {
            activePickerInstance.destroy();
            activePickerInstance = null;
            return;
          }

          // 创建新面板
          activePickerInstance = new CustomColorPicker({
            type: type as 'forecolor' | 'backcolor',
            editor,
            anchorEl: wrapper,
            onApply: (color: string) => {
              editor.execCommand(type === 'forecolor' ? 'forecolor' : 'backcolor', color);
              // 更新色块指示
              const colorLump = wrapper.querySelector('.edui-colorlump') as HTMLElement;
              if (colorLump) colorLump.style.backgroundColor = color;
            },
            onClose: () => {
              activePickerInstance = null;
            }
          });

          // 尝试获取当前已选颜色
          try {
            const currentColor = editor.queryCommandValue(type === 'forecolor' ? 'forecolor' : 'backcolor');
            if (currentColor) {
              activePickerInstance.setColor(currentColor);
            }
          } catch (_) { /* 忽略 */ }
        });
      }

      // 同样拦截按钮主体点击（直接应用最近颜色）- 保持原有行为不变
    });
  }, 500);
}
