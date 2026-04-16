<template>
  <div class="button-showcase">
    <h1>编辑页面功能性按钮演示</h1>
    <p class="subtitle">高亮样式以撤销按钮为准</p>

    <section class="showcase-section">
      <h2>图标按钮 .action-icon-btn</h2>

      <div class="button-group">
        <h3>默认状态</h3>
        <div class="button-row">
          <button class="action-icon-btn" title="撤销">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="action-icon-btn" title="重做">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="action-icon-btn" title="预览">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-icon-btn" title="评论批注">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </button>
          <button class="action-icon-btn" title="更多操作">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
        <p class="desc">透明背景，color: rgba(0,0,0,0.6)</p>
      </div>

      <div class="button-group">
        <h3>Hover 状态</h3>
        <div class="button-row">
          <button class="action-icon-btn demo-hover" title="撤销">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="action-icon-btn demo-hover" title="重做">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="action-icon-btn demo-hover" title="预览">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-icon-btn demo-hover" title="评论批注">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </button>
          <button class="action-icon-btn demo-hover" title="更多操作">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
        <p class="desc">background: rgba(255,255,255,0.5), color: rgba(0,0,0,0.9)</p>
      </div>

      <div class="button-group">
        <h3>Active/Pressed 状态</h3>
        <div class="button-row">
          <button class="action-icon-btn demo-active" title="撤销">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="action-icon-btn demo-active" title="重做">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="action-icon-btn demo-active" title="预览">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="action-icon-btn demo-active" title="评论批注">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </button>
          <button class="action-icon-btn demo-active" title="更多操作">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
        <p class="desc">background: rgba(0,0,0,0.05)</p>
      </div>

      <div class="button-group">
        <h3>Toggle Active 状态 (选中状态)</h3>
        <div class="button-row">
          <button class="action-icon-btn active" title="评论批注">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </button>
        </div>
        <p class="desc">background: rgba(255,255,255,0.5), color: #1D1D1F</p>
      </div>
    </section>

    <section class="showcase-section">
      <h2>主要操作按钮 .action-btn.primary-btn</h2>
      <div class="button-row">
        <button class="action-btn primary-btn">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M10 2a1 1 0 0 1 .894.553l5.974 11.95A1 1 0 0 1 16.026 16H3.974a1 1 0 0 1-.894-1.447L9.106 2.553A1 1 0 0 1 10 2z"/></svg>
          发布
        </button>
      </div>
      <p class="desc">background: #1D1D1F, color: #ffffff, border-radius: 999px (胶囊形状)</p>

      <h3 style="margin-top: 24px;">Hover 状态</h3>
      <div class="button-row">
        <button class="action-btn primary-btn demo-primary-hover">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M10 2a1 1 0 0 1 .894.553l5.974 11.95A1 1 0 0 1 16.026 16H3.974a1 1 0 0 1-.894-1.447L9.106 2.553A1 1 0 0 1 10 2z"/></svg>
          发布
        </button>
      </div>
      <p class="desc">opacity: 0.9, transform: translateY(-1px)</p>
    </section>

    <section class="showcase-section">
      <h2>完整工具条示例</h2>
      <div class="action-bar-demo">
        <div class="action-bar-left">
          <div class="action-group">
            <button class="action-icon-btn" title="撤销">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="action-icon-btn" title="重做">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </div>

        <div class="action-bar-right">
          <div class="action-group">
            <button class="action-icon-btn" title="预览">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-icon-btn active" title="评论批注">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </button>
            <button class="action-icon-btn" title="更多操作">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>

          <div class="action-bar-divider"></div>

          <button class="action-btn primary-btn">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M10 2a1 1 0 0 1 .894.553l5.974 11.95A1 1 0 0 1 16.026 16H3.974a1 1 0 0 1-.894-1.447L9.106 2.553A1 1 0 0 1 10 2z"/></svg>
            发布
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// No logic needed for this showcase
</script>

<style scoped>
.button-showcase {
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.button-showcase h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 40px;
}

.showcase-section {
  margin-bottom: 48px;
  padding: 24px;
  background: #fafafa;
  border-radius: 12px;
}

.showcase-section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.showcase-section h3 {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.button-group {
  margin-bottom: 24px;
}

.button-group .desc {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* .action-icon-btn styles */
.action-icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0,0,0,0.6);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.action-icon-btn:hover {
  background: rgba(255,255,255,0.5);
  color: rgba(0,0,0,0.9);
}

.action-icon-btn:active {
  background: rgba(0,0,0,0.05);
}

.action-icon-btn.active {
  background: rgba(255,255,255,0.5);
  color: #1D1D1F;
}

/* Demo hover state */
.action-icon-btn.demo-hover {
  background: rgba(255,255,255,0.5);
  color: rgba(0,0,0,0.9);
}

/* Demo active state */
.action-icon-btn.demo-active {
  background: rgba(0,0,0,0.05);
  color: rgba(0,0,0,0.6);
}

/* .action-btn styles */
.action-btn {
  height: 32px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  transition: all 0.15s;
}

.primary-btn {
  background: #1D1D1F;
  color: #ffffff;
  border-radius: 999px;
  padding: 0 16px;
}

.primary-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.demo-primary-hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Action bar demo */
.action-bar-demo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px 16px;
  border-radius: 12px;
}

.action-bar-left,
.action-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.action-bar-demo .action-icon-btn {
  color: rgba(255,255,255,0.85);
}

.action-bar-demo .action-icon-btn:hover {
  background: rgba(255,255,255,0.2);
  color: #ffffff;
}

.action-bar-demo .action-icon-btn.active {
  background: rgba(255,255,255,0.25);
  color: #ffffff;
}

.action-bar-demo .action-icon-btn:active {
  background: rgba(0,0,0,0.1);
}

.action-bar-divider {
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.2);
  margin: 0 4px;
}

.action-bar-demo .primary-btn {
  background: #ffffff;
  color: #1D1D1F;
}

.action-bar-demo .primary-btn:hover {
  background: rgba(255,255,255,0.9);
}
</style>
