<template>
  <div class="home-layout">
    <!-- 导航栏 -->
    <nav class="topnav" :class="{ 'topnav--scrolled': scrolled }">
      <router-link to="/" class="topnav__logo">
        <Logo :size="18" />
        <span>WxEditor</span>
      </router-link>

      <a href="#features" class="topnav__item" @click.prevent="scrollTo('features')">功能</a>
      <a href="#workflow" class="topnav__item" @click.prevent="scrollTo('workflow')">流程</a>
      <a href="#pricing" class="topnav__item" @click.prevent="scrollTo('pricing')">定价</a>

      <div class="topnav__spacer" />

      <div class="topnav__right">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/projects" class="topnav__badge">工作台</router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="topnav__item">登录</router-link>
          <router-link to="/register" class="topnav__badge">免费注册</router-link>
        </template>
      </div>
    </nav>

    <!-- 主内容区域 — 通宽堆叠 -->
    <div class="home-content">

      <!-- Hero 区域 -->
      <section class="hero-section">
        <div class="hero-inner">
          <div class="hero-content">
            <div class="hero-badge">
              <Sparkles :size="14" />
              <span>全新 AI 写作助手已上线</span>
              <ChevronRight :size="14" />
            </div>

            <h1 class="hero-title">
              微信公众号<br/>
              图文排版编辑器
            </h1>

            <p class="hero-desc">
              集 AI 智能写作、精美模板、一键同步、多人协作于一体。<br/>
              从灵感到发布，只需几分钟。
            </p>

            <div class="hero-actions">
              <router-link to="/register" class="hero-btn hero-btn--dark">
                立即体验
              </router-link>
              <a href="#features" class="hero-btn hero-btn--light" @click.prevent="scrollTo('features')">
                了解更多
              </a>
            </div>

            <div class="hero-proof">
              <div class="hero-avatars">
                <div v-for="(a, i) in proofAvatars" :key="i" class="hero-avatar" :style="{ background: a.color }">{{ a.letter }}</div>
              </div>
              <span class="hero-proof-text"><strong>2,000+</strong> 创作者正在使用</span>
            </div>
          </div>

          <!-- Hero 编辑器模拟 -->
          <div class="hero-visual">
            <div class="hero-mockup-wrapper">
              <div class="mockup-window">
                <div class="mockup-bar">
                  <div class="mockup-dots"><span class="red"/><span class="yellow"/><span class="green"/></div>
                  <span class="mockup-title">如何打造爆款文章 - WxEditor</span>
                  <div class="mockup-btn">预览</div>
                </div>
                <div class="mockup-body">
                  <div class="mockup-sidebar">
                    <div class="mock-sidebar-icon active"><Menu :size="16" /></div>
                    <div class="mock-sidebar-icon"><FolderOpen :size="16" /></div>
                    <div class="mock-sidebar-icon"><Type :size="16" /></div>
                  </div>
                  <div class="mockup-content">
                    <div class="mock-toolbar">
                      <div class="mock-tool"><FileText :size="14"/></div>
                      <div class="mock-tool"><List :size="14"/></div>
                      <div class="mock-tool"><ListOrdered :size="14"/></div>
                      <div class="mock-tool mock-tool-ai"><Sparkles :size="12"/> AI 帮你写</div>
                    </div>
                    <div class="mock-editor">
                      <div class="mock-heading">10万+爆款长文的排版秘籍</div>
                      <div class="mock-img-placeholder">
                        <ImageIcon :size="24" class="mock-placeholder-icon" />
                      </div>
                      <div class="mock-text-line" style="width: 100%" />
                      <div class="mock-text-line" style="width: 100%" />
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 悬浮弹窗 (破框感) -->
              <div class="float-widget float-widget--alex">
                <div class="cursor-svg">
                  <MousePointer2 :size="18" fill="#1890ff" stroke="#fff" />
                </div>
                <div class="cursor-label">Alex</div>
              </div>

              <div class="float-widget float-widget--save">
                <div class="save-icon"><Check :size="12" /></div>
                <span>自动保存成功</span>
              </div>

              <div class="float-widget float-widget--ai-popup">
                <div class="popup-icon"><Sparkles :size="14" /></div>
                <div class="popup-text">
                  <strong>AI 已生成结尾总结</strong>
                  <span>点击一键替换至光标处</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 数据统计 -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-item" v-for="(s, i) in stats" :key="i">
            <span class="stat-value">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </section>

      <!-- 功能特性 -->
      <section id="features" class="features-section">
        <div class="section-head">
           <div class="section-badge">核心功能</div>
           <h2 class="section-title">为公众号创作者量身定制</h2>
           <p class="section-desc">从创作到发布的每一步，我们都精心打磨</p>
        </div>

        <div class="features-container">
          <!-- AI 主打卡片 -->
          <div class="ai-hero-card">
            <div class="ai-card-content">
              <div class="ai-tag"><Sparkles :size="12"/> AI 驱动·HOT</div>
              <h3 class="ai-title">AI 智能写作，让创作效率倍增</h3>
              <p class="ai-desc">集成通义千问大模型，支持标题生成、内容润色、智能改写、一键摘要，让 AI 成为你的写作搭档。</p>
              <div class="ai-feature-list">
                <span class="ai-feature-item"><Check :size="14"/> 智能标题生成</span>
                <span class="ai-feature-item"><Check :size="14"/> 全文润色改写</span>
                <span class="ai-feature-item"><Check :size="14"/> 一键摘要</span>
              </div>
            </div>
            <div class="ai-card-visual">
              <div class="ai-visual-mock">
                <div class="ai-mock-header"><Sparkles :size="12" /> AI 正在为您润色...</div>
                <div class="ai-mock-text">
                  <p>在数字营销时代，如何利用好的工具打造优质内容，成为了每一个创作者关心的核心问题。通过不断的迭代...</p>
                  <p class="ai-highlight">WxEditor 的全新 AI 助手，能够理解你的创作意图，</p>
                  <p>为你提供源源不断的灵感，不仅能一键优化排版，更能让你的文字焕发新的活力。</p>
                </div>
                <div class="ai-mock-float">
                  <div class="save-icon"><Check :size="12" /></div>标题已优化完成
                </div>
              </div>
            </div>
          </div>

          <!-- 便签风 3+2 Bento 网格 -->
          <div class="bento-wrapper">
             <div class="bento-row">
               <div class="bento-card bg-orange">
                 <div class="washi-tape tape-1"></div>
                 <div class="bento-bg-wrap"><div class="bento-bg-icon pos-1"><Box :size="200" :stroke-width="1" /></div></div>
                 <div class="bento-front">
                    <div class="bento-icon orange-icon"><Palette :size="20"/></div>
                    <h3>海量模板库</h3>
                    <p>200+ 精美预设模板，一键应用，快速美化文章排版。支持自定义样式保存和分享。</p>
                 </div>
               </div>

               <div class="bento-card bg-purple wide">
                 <div class="washi-tape tape-2"></div>
                 <div class="bento-bg-wrap"><div class="bento-bg-icon pos-1"><Users :size="200" :stroke-width="1" /></div></div>
                 <div class="bento-front">
                    <div class="bento-icon purple-icon"><Users :size="20"/></div>
                    <h3>多人实时协作</h3>
                    <p>实时同步编辑、光标共现、即时聊天，团队创作更高效。支持权限管理和版本历史。</p>
                 </div>
               </div>
             </div>
             
             <div class="bento-row">
               <div class="bento-card bg-green">
                 <div class="washi-tape tape-3"></div>
                 <div class="bento-bg-wrap"><div class="bento-bg-icon pos-1"><RefreshCw :size="200" :stroke-width="1" /></div></div>
                 <div class="bento-front">
                    <div class="bento-icon green-icon"><RefreshCw :size="20"/></div>
                    <h3>一键推送到微信</h3>
                    <p>一键推送到微信公众号草稿箱，图片自动上传、格式完美保留，告别繁琐。</p>
                 </div>
               </div>
               
               <div class="bento-card bg-blue wide">
                 <div class="washi-tape tape-4"></div>
                 <div class="bento-bg-wrap"><div class="bento-bg-icon pos-2"><PenTool :size="240" :stroke-width="1" /></div></div>
                 <div class="bento-front">
                    <div class="bento-icon blue-icon"><PenTool :size="20"/></div>
                    <h3>专业排版编辑</h3>
                    <p>基于 UEditor 深度定制，所见即所得的编辑体验，丰富的排版工具伴你顺滑操作。</p>
                 </div>
               </div>
               <div class="bento-card bg-yellow">
                 <div class="washi-tape tape-5"></div>
                 <div class="bento-bg-wrap"><div class="bento-bg-icon pos-1"><FolderKey :size="200" :stroke-width="1" /></div></div>
                 <div class="bento-front">
                    <div class="bento-icon yellow-icon"><FolderOpen :size="20"/></div>
                    <h3>素材统一管理</h3>
                    <p>图片、视频、文件统一分类，随用随取，支持批量操作，杜绝文件丢失。</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      <!-- 工作流程 -->
      <section id="workflow" class="workflow-section">
        <div class="section-head">
          <div class="section-badge section-badge--light">核心动作</div>
          <h2 class="section-title">三步完成精美排版</h2>
          <p class="section-desc">极简流程，让创作重归内容本身</p>
        </div>
        <div class="workflow-grid">
           <!-- Step 1 -->
           <div class="workflow-step">
              <div class="wf-num wf-blue-text">01</div>
              <div class="wf-icon-box wf-blue"><PenTool :size="28"/></div>
              <h3>撰写内容</h3>
              <p>使用富文本编辑器撰写文章，或借助 AI 快速生成初稿</p>
           </div>
           
           <div class="wf-arrow"><ChevronRight :size="32"/></div>
           
           <!-- Step 2 -->
           <div class="workflow-step">
              <div class="wf-num wf-pink-text">02</div>
              <div class="wf-icon-box wf-pink"><Palette :size="28"/></div>
              <h3>美化排版</h3>
              <p>从模板库选择喜欢的样式，一键应用到文章中</p>
           </div>
           
           <div class="wf-arrow"><ChevronRight :size="32"/></div>
           
           <!-- Step 3 -->
           <div class="workflow-step">
              <div class="wf-num wf-green-text">03</div>
              <div class="wf-icon-box wf-green"><Send :size="28"/></div>
              <h3>一键发布</h3>
              <p>直接同步到微信公众号草稿箱，随时发布</p>
           </div>
        </div>
      </section>

      <!-- 定价 -->
      <section id="pricing" class="pricing-section">
        <div class="section-head">
          <div class="section-badge">定价方案</div>
          <h2 class="section-title">选择适合你的方案</h2>
          <p class="section-desc">灵活的定价，满足不同需求</p>
        </div>

        <!-- 清爽胶带美化版定价区 -->
        <div class="pricing-desk">
           <div class="pricing-cards">
              <div class="pricing-card pricing-card--blue">
                <div class="washi-tape p-tape-1"></div>
                <span class="pricing-label">免费版</span>
                <div class="pricing-price">
                  <span class="price-val">¥0</span>
                  <span class="price-unit">/月</span>
                </div>
                <span class="pricing-desc">基础功能体验</span>
                <div class="pricing-divider" />
                <ul class="pricing-features">
                  <li><Check :size="14" class="p-check"/> 3 个项目</li>
                  <li><Check :size="14" class="p-check"/> 100MB 存储</li>
                  <li><Check :size="14" class="p-check"/> 基础模板库</li>
                </ul>
                <router-link to="/register" class="pricing-btn pricing-btn--outline">当前方案</router-link>
              </div>

              <div class="pricing-card pricing-card--pink raise-up">
                <div class="washi-tape p-tape-2"></div>
                <div class="pricing-badge"><Sparkles :size="12"/> 推荐</div>
                <span class="pricing-label pricing-label--dark">专业版</span>
                <div class="pricing-price">
                  <span class="price-val">¥29</span>
                  <span class="price-unit">/月</span>
                </div>
                <span class="pricing-desc">内容创作者的首选</span>
                <div class="pricing-divider pricing-divider--dark" />
                <ul class="pricing-features pricing-features--dark">
                  <li><Check :size="14" class="p-check"/> 无限项目</li>
                  <li><Check :size="14" class="p-check"/> 5GB 存储空间</li>
                  <li><Check :size="14" class="p-check"/> AI 辅助写作</li>
                </ul>
                <router-link to="/register" class="pricing-btn pricing-btn--primary">立即升级</router-link>
              </div>

              <div class="pricing-card pricing-card--purple">
                <div class="washi-tape p-tape-3"></div>
                <span class="pricing-label">企业版</span>
                <div class="pricing-price">
                  <span class="price-val">¥99</span>
                  <span class="price-unit">/月</span>
                </div>
                <span class="pricing-desc">专为团队和企业打造</span>
                <div class="pricing-divider" />
                <ul class="pricing-features">
                  <li><Check :size="14" class="p-check"/> 专业版全部功能</li>
                  <li><Check :size="14" class="p-check"/> 50GB 存储・团队协作</li>
                  <li><Check :size="14" class="p-check"/> 数据统计・专属支持</li>
                </ul>
                <router-link to="/pricing" class="pricing-btn pricing-btn--outline">联系我们</router-link>
              </div>
           </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta-section">
        <h2 class="cta-title">准备好提升创作效率了吗？</h2>
        <p class="cta-desc">加入 2,000+ 创作者，免费开始你的 WxEditor 之旅</p>
        <router-link to="/register" class="cta-btn">
          立即体验 <ArrowRight :size="16" />
        </router-link>
      </section>

      <!-- 页脚 -->
      <footer class="home-footer">
        <div class="footer-inner">
          <div class="footer-top">
            <div class="footer-brand">
              <div class="footer-logo"><Logo :size="22" /><span>WxEditor</span></div>
              <p>一款充满灵感、轻盈高效的图文编辑器</p>
            </div>
            <div class="footer-cols">
              <div class="footer-col" v-for="(col, ci) in footerCols" :key="ci">
                <h4>{{ col.title }}</h4>
                <template v-for="(link, li) in col.links" :key="li">
                  <router-link v-if="link.route" :to="link.route">{{ link.label }}</router-link>
                  <a v-else-if="link.anchor" href="#" @click.prevent="scrollTo(link.anchor)">{{ link.label }}</a>
                  <a v-else href="#">{{ link.label }}</a>
                </template>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <p>© {{ currentYear }} WxEditor. 基于 Pencil 风格构建。</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  ArrowRight, ChevronRight, Check, Sparkles, Send, Users, PenTool, 
  RefreshCw, Palette, FolderOpen, Menu, List, ListOrdered, FileText,
  Image as ImageIcon, MousePointer2, Type, FolderKey, Box
} from 'lucide-vue-next';
import Logo from '@/components/navigation/Logo.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

// 首次加载时从 localStorage 恢复登录状态
if (!userStore.isLoggedIn) {
  userStore.initFromStorage();
}

// ===== 滚动状态 =====
const scrolled = ref(false);
const currentYear = new Date().getFullYear();

function handleScroll() {
  scrolled.value = window.scrollY > 20;
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 数据 =====
const proofAvatars = [
  { letter: '王', color: '#BAE6FD' },
  { letter: '李', color: '#FBCFE8' },
  { letter: '张', color: '#A7F3D0' },
  { letter: '刘', color: '#DDD6FE' },
  { letter: '陈', color: '#FED7AA' },
];

const stats = [
  { value: '2,000+', label: '活跃创作者' },
  { value: '50,000+', label: '篇文章已创建' },
  { value: '200+', label: '精美模板' },
  { value: '99.9%', label: '同步成功率' },
];

const footerCols = [
  { title: '产品', links: [{ label: '功能介绍', anchor: 'features' }, { label: '定价方案', anchor: 'pricing' }, { label: '模板库', route: '/templates' }] },
  { title: '支持', links: [{ label: '帮助中心' }, { label: '联系我们' }, { label: '常见问题' }] },
  { title: '关于', links: [{ label: '关于我们' }, { label: '服务条款' }, { label: '隐私政策' }] },
];
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

// ===== 整体布局 =====
.home-layout {
  height: 100vh;
  overflow-y: auto;
  background: $layout-light-bg;
  font-family: $font-family;
  padding-top: calc($nav-offset + 14px);
}

// ===== 导航栏 =====
.topnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 20px;
  background: $brand-yellow;
  border-radius: 0 0 12px 12px;
  margin: 0 14px;
  gap: 4px;
  transition: box-shadow 0.3s;

  &--scrolled { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); }

  &__logo {
    display: flex; align-items: center; gap: 8px; margin-right: 16px;
    font-size: 16px; font-weight: 800; color: $layout-sider-dark; text-decoration: none;
  }
  &__item {
    padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; color: rgba(29, 29, 31, 0.7); text-decoration: none; transition: 150ms;
    &:hover { background: rgba(0, 0, 0, 0.05); color: $layout-sider-dark; }
  }
  &__spacer { flex: 1; }
  &__right { display: flex; align-items: center; gap: 12px; }
  &__badge {
    padding: 8px 16px; border-radius: 999px; background: $layout-sider-dark; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; transition: 150ms;
    &:hover { opacity: 0.85; }
  }
}

// ===== 内容区域 =====
.home-content {
  display: flex; flex-direction: column; gap: 14px; padding: 0 14px;
}

// Section Base
section {
  border-radius: 12px 12px 0 0;
}

// ===== Hero 区域 =====
.hero-section {
  background: $brand-yellow;
  padding: 80px 40px 60px;
}

.hero-inner {
  max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
}

.hero-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(255, 255, 255, 0.6); border-radius: 999px; font-size: 13px; font-weight: 700; color: $layout-sider-dark; margin-bottom: 24px;
}

.hero-title {
  font-size: 3.8rem; font-weight: 900; color: $layout-sider-dark; line-height: 1.15; margin-bottom: 24px; letter-spacing: -0.02em;
}

.hero-desc {
  font-size: 1.15rem; color: rgba(0, 0, 0, 0.5); line-height: 1.8; margin-bottom: 40px; max-width: 440px; font-weight: 500;
}

.hero-actions { display: flex; gap: 16px; margin-bottom: 48px; }

.hero-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; transition: all 0.2s;
  &--dark { background: $layout-sider-dark; color: #fff; &:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); } }
  &--light { background: #fff; color: $layout-sider-dark; border: 1px solid rgba(0,0,0,0.05); &:hover { background: rgba(255,255,255,0.8); } }
}

.hero-proof { display: flex; align-items: center; gap: 16px; }
.hero-avatars { display: flex; }
.hero-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: rgba(0, 0, 0, 0.6); border: 2px solid #fff; margin-left: -12px; &:first-child { margin-left: 0; } }
.hero-proof-text { font-size: 14px; color: rgba(0, 0, 0, 0.45); strong { color: $layout-sider-dark; font-weight: 800; font-size: 16px; } }

// Hero Mockup
.hero-visual { position: relative; }
.hero-mockup-wrapper { position: relative; width: 100%; padding: 40px 0; }
.mockup-window { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 0 rgba(0,0,0,0.02), 0 32px 64px -12px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.04); }
.mockup-bar { display: flex; align-items: center; padding: 16px; background: #fff; border-bottom: 1px solid rgba(0,0,0,0.06); gap: 16px; }
.mockup-dots { display: flex; gap: 8px; span { width: 12px; height: 12px; border-radius: 50%; } .red{background:#FF5F57;} .yellow{background:#FEBC2E;} .green{background:#28C840;} }
.mockup-title { flex: 1; font-size: 13px; font-weight: 600; color: rgba(0,0,0,0.3); text-align: center; }
.mockup-btn { font-size: 13px; font-weight: 700; padding: 6px 14px; background: $brand-yellow; color: $layout-sider-dark; border-radius: 6px; }
.mockup-body { display: flex; height: 360px; }
.mockup-sidebar { width: 56px; background: #FAFAFA; border-right: 1px solid rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; padding: 20px 0; gap: 20px; }
.mock-sidebar-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,0.3); border-radius: 8px; &.active { background: rgba(0,0,0,0.05); color: $layout-sider-dark; } }
.mockup-content { flex: 1; display: flex; flex-direction: column; }
.mock-toolbar { display: flex; align-items: center; padding: 12px 24px; gap: 16px; border-bottom: 1px dashed rgba(0,0,0,0.05); }
.mock-tool { color: rgba(0,0,0,0.3); }
.mock-tool-ai { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba($macaron-pink, 0.4); color: #C2185B; border-radius: 6px; font-size: 12px; font-weight: 700; }
.mock-editor { padding: 40px 48px; display: flex; flex-direction: column; gap: 20px; }
.mock-heading { font-size: 22px; font-weight: 800; color: $layout-sider-dark; }
.mock-img-placeholder { height: 140px; background: #E0F2FE; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.mock-placeholder-icon { color: rgba(255,255,255, 0.8); width: 64px; height: 64px; }
.mock-text-line { height: 12px; background: #F3F4F6; border-radius: 6px; }

// Float Widgets
.float-widget { position: absolute; background: #fff; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); display: flex; align-items: center; z-index: 10; }
.float-widget--alex { top: 220px; left: 240px; background: transparent; box-shadow: none; flex-direction: column; gap: 4px; animation: floatX 4s infinite ease-in-out; }
.cursor-label { background: #1890ff; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; transform: rotate(-2deg); }
.float-widget--save { top: 16px; right: 28px; padding: 8px 16px; gap: 8px; font-size: 12px; font-weight: 700; color: $layout-sider-dark; transform: rotate(2deg); .save-icon { color: #2E7D32; } }
.float-widget--ai-popup { bottom: 24px; right: -32px; padding: 16px; gap: 12px; transform: rotate(-3deg); .popup-icon { background: $macaron-pink; padding: 8px; border-radius: 8px; color: #C2185B; display: inline-flex;} .popup-text { display: flex; flex-direction: column; gap: 4px; } strong { font-size: 14px; color: $layout-sider-dark; } span { font-size: 11px; color: rgba(0,0,0,0.4); } }
@keyframes floatX { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

// ===== 数据统计 =====
.stats-section { background: #fff; padding: 64px 24px; }
.stats-grid { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
.stat-item { text-align: center; display: flex; flex-direction: column; gap: 8px; }
.stat-value { font-size: 2.5rem; font-weight: 900; background: linear-gradient(180deg, #111827 0%, #4B5563 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
.stat-label { font-size: 1rem; font-weight: 600; color: rgba(0,0,0,0.35); }

// ===== 通用区块标题 =====
.section-head { text-align: center; margin-bottom: 64px; }
.section-badge { display: inline-flex; padding: 6px 16px; background: $brand-yellow; border-radius: 999px; font-size: 13px; font-weight: 700; margin-bottom: 16px; color: $layout-sider-dark; &--light { background: #fff; } }
.section-title { font-size: 2.2rem; font-weight: 900; color: $layout-sider-dark; margin-bottom: 12px; letter-spacing: -0.02em; }
.section-desc { font-size: 1.15rem; color: rgba(0,0,0,0.4); font-weight: 500; }

// ===== 定制化功能区域 =====
.features-section { background: #fff; padding: 80px 40px; }
.features-container { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }

// AI Hero 宽卡片
.ai-hero-card { display: flex; background: $macaron-pink; border-radius: 12px 12px 0 0; overflow: hidden; min-height: 400px; }
.ai-card-content { flex: 1; padding: 64px; display: flex; flex-direction: column; justify-content: center; }
.ai-tag { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255,255,255,0.6); border-radius: 999px; font-size: 13px; font-weight: 800; color: #C2185B; width: fit-content; margin-bottom: 24px; }
.ai-title { font-size: 2rem; font-weight: 900; color: $layout-sider-dark; margin-bottom: 16px; line-height: 1.3; }
.ai-desc { font-size: 1.1rem; color: rgba(0,0,0,0.7); line-height: 1.8; margin-bottom: 32px; font-weight: 500; }
.ai-feature-list { display: flex; gap: 20px; }
.ai-feature-item { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: $layout-sider-dark; }

.ai-card-visual { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 40px; }
.ai-visual-mock { background: rgba(255,255,255,0.9); border-radius: 16px; padding: 32px; width: 440px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); position: relative; }
.ai-mock-header { font-size: 13px; font-weight: 800; color: #C2185B; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.ai-mock-text p { font-size: 15px; color: rgba(0,0,0,0.5); line-height: 1.7; margin-bottom: 12px; font-weight: 500; }
.ai-mock-text p.ai-highlight { background: rgba(251,207,232, 0.4); color: #C2185B; font-weight: 700; padding: 8px; border-radius: 6px; margin: 8px 0; }
.ai-mock-float { position: absolute; right: -24px; bottom: -16px; background: #fff; padding: 12px 16px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: $layout-sider-dark; .save-icon { background: $macaron-green; color: #2E7D32; padding: 4px; border-radius: 6px; display: inline-flex; } }

// Bento 网格
.bento-wrapper { display: flex; flex-direction: column; gap: 24px; }
.bento-row { display: flex; gap: 24px; min-height: 320px; }
.bento-card { flex: 1; border-radius: 12px 12px 0 0; padding: 48px 36px; position: relative; display: flex; align-items: flex-start; justify-content: flex-end; flex-direction: column; transition: transform 0.2s; &:hover { transform: translateY(-4px); } }
.bento-card.wide { flex: 1.5; }
.bg-orange { background: $macaron-orange; } .bg-purple { background: $macaron-purple; } .bg-green { background: $macaron-green; } .bg-blue { background: $macaron-blue; } .bg-yellow { background: $brand-yellow; }

.bento-bg-wrap { position: absolute; inset: 0; overflow: hidden; border-radius: 12px 12px 0 0; z-index: 0; pointer-events: none; }
.bento-bg-icon { position: absolute; color: rgba(255,255,255,0.3); }
.pos-1 { top: 100px; left: 160px; }
.pos-2 { top: 80px; left: 280px; }

.washi-tape { position: absolute; top: 0px; left: 50%; width: 72px; height: 20px; margin-left: -36px; background: rgba(255,255,255,0.7); box-shadow: 0 2px 6px rgba(0,0,0,0.05); z-index: 10; transform: translateY(-50%); }
.tape-1 { transform: translateY(-50%) rotate(-3deg); } .tape-2 { transform: translateY(-50%) rotate(2deg); } .tape-3 { transform: translateY(-50%) rotate(-1deg); } .tape-4 { transform: translateY(-50%) rotate(4deg); } .tape-5 { transform: translateY(-50%) rotate(-2deg); }

.bento-front { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }
.bento-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.6); margin-bottom: 8px; }
.orange-icon { color: #E65100; } .purple-icon { color: #6A1B9A; } .green-icon { color: #2E7D32; } .blue-icon { color: #0277BD; } .yellow-icon { color: #F57F17; }
.bento-front h3 { font-size: 1.3rem; font-weight: 800; color: $layout-sider-dark; margin: 0; }
.bento-front p { font-size: 1rem; color: rgba(0,0,0,0.65); line-height: 1.6; margin: 0; font-weight: 500; }

// ===== 工作流程 =====
.workflow-section { background: $layout-light-bg; padding: 100px 40px; }
.workflow-grid { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
.workflow-step { flex: 1; background: #fff; padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.wf-num { font-size: 3rem; font-weight: 900; opacity: 0.5; line-height: 1; }
.wf-blue-text { color: $macaron-blue; } .wf-pink-text { color: $macaron-pink; } .wf-green-text { color: $macaron-green; }
.wf-icon-box { width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-top: -24px; margin-bottom: 12px; }
.wf-blue { background: $macaron-blue; color: #0277BD; } .wf-pink { background: $macaron-pink; color: #C2185B; } .wf-green { background: $macaron-green; color: #2E7D32; }
.workflow-step h3 { font-size: 1.4rem; font-weight: 900; color: $layout-sider-dark; margin: 0; }
.workflow-step p { font-size: 1rem; color: rgba(0,0,0,0.4); margin: 0; font-weight: 500; }
.wf-arrow { color: rgba(0,0,0,0.1); }

// ===== 定价 =====
.pricing-section { background: #fff; padding: 80px 40px; }
.pricing-desk { max-width: 1000px; margin: 60px auto 0; position: relative; }

.pricing-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; position: relative; z-index: 1; align-items: center; }
.pricing-card { background: #fff; border-radius: 12px 12px 0 0; padding: 48px 40px; display: flex; flex-direction: column; position: relative; box-shadow: 0 12px 40px rgba(0,0,0,0.06); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); height: 100%; }
.pricing-card:hover { transform: translateY(-8px); box-shadow: 0 24px 60px rgba(0,0,0,0.08); }
.raise-up { transform: translateY(-16px); box-shadow: 0 20px 60px rgba(0,0,0,0.1); border: 2px solid #fff; z-index: 2; height: calc(100% + 32px); }
.raise-up:hover { transform: translateY(-24px); box-shadow: 0 32px 80px rgba(0,0,0,0.15); }

.p-tape-1 { transform: translateY(-50%) rotate(-1deg); width: 60px; }
.p-tape-2 { transform: translateY(-50%) rotate(2deg); width: 70px; background: rgba(255,255,255,0.85); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.p-tape-3 { transform: translateY(-50%) rotate(-2deg); width: 60px; }

.pricing-card--blue { background: rgba($macaron-blue, 0.6); }
.pricing-card--pink { background: rgba($macaron-pink, 0.8); }
.pricing-card--purple { background: rgba($macaron-purple, 0.4); }
.pricing-badge { position: absolute; top: 16px; right: 24px; left: auto; transform: none; background: transparent; color: #1D1D1F; padding: 0; font-size: 14px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; }
.pricing-label { font-size: 15px; font-weight: 700; color: rgba(0,0,0,0.6); margin-bottom: 20px; &--dark { color: $layout-sider-dark; } }
.pricing-price { margin-bottom: 12px; }
.price-val { font-size: 2.8rem; font-weight: 900; color: $layout-sider-dark; letter-spacing: -0.05em; }
.price-unit { font-size: 1rem; font-weight: 600; color: rgba(0,0,0,0.5); }
.pricing-desc { font-size: 1rem; color: rgba(0,0,0,0.65); font-weight: 600; margin-bottom: 32px; display: block; }
.pricing-divider { height: 1px; background: rgba(0,0,0,0.08); margin-bottom: 32px; &--dark { background: rgba(0,0,0,0.12); } }
.pricing-features { list-style: none; padding: 0; margin: 0 0 48px 0; display: flex; flex-direction: column; gap: 20px; }
.pricing-features li { display: flex; align-items: center; gap: 12px; font-size: 1rem; font-weight: 600; color: rgba(0,0,0,0.7); }
.p-check { color: #2E7D32; }
.pricing-features--dark li { color: $layout-sider-dark; }
.pricing-btn { margin-top: auto; padding: 16px; text-align: center; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; transition: 0.2s; }
.pricing-btn--outline { border: 1px solid rgba(0,0,0,0.1); color: $layout-sider-dark; &:hover { background: rgba(0,0,0,0.04); } }
.pricing-btn--primary { background: $layout-sider-dark; color: #fff; &:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); } }

// ===== CTA =====
.cta-section { background: $brand-yellow; padding: 100px 40px; text-align: center; border-radius: 12px 12px 0 0; }
.cta-title { font-size: 2.5rem; font-weight: 900; color: $layout-sider-dark; margin-bottom: 20px; letter-spacing: -0.02em; }
.cta-desc { font-size: 1.25rem; color: rgba(0,0,0,0.5); margin-bottom: 40px; font-weight: 500; }
.cta-btn { display: inline-flex; align-items: center; gap: 12px; padding: 20px 40px; background: $layout-sider-dark; color: #fff; border-radius: 12px; font-size: 18px; font-weight: 700; text-decoration: none; transition: 0.2s; &:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); } }

// ===== 页脚 =====
.home-footer { background: #fff; padding: 80px 40px 40px; }
.footer-inner { max-width: 1100px; margin: 0 auto; }
.footer-top { display: flex; justify-content: space-between; gap: 80px; margin-bottom: 80px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 64px; }
.footer-brand { max-width: 320px; }
.footer-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 20px; font-weight: 800; color: $layout-sider-dark; }
.footer-brand p { font-size: 1rem; color: rgba(0,0,0,0.4); line-height: 1.8; font-weight: 500; margin: 0; }
.footer-cols { display: flex; gap: 100px; }
.footer-col h4 { font-size: 1.1rem; font-weight: 800; color: $layout-sider-dark; margin: 0 0 24px 0; }
.footer-col a { display: block; font-size: 1rem; color: rgba(0,0,0,0.5); font-weight: 500; text-decoration: none; margin-bottom: 16px; transition: 0.2s; &:hover { color: $layout-sider-dark; } }
.footer-bottom { text-align: center; font-size: 0.9rem; color: rgba(0,0,0,0.3); font-weight: 500; margin: 0; }

// ===== 响应式 (简单适配) =====
@media (max-width: 1024px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; gap: 40px; }
  .hero-desc { margin: 0 auto 32px; }
  .hero-actions { justify-content: center; }
  .hero-proof { justify-content: center; }
  .hero-visual { padding: 0 20px; }
  .float-widget--alex { display: none; }
  
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 40px; }
  .ai-hero-card { flex-direction: column; }
  .ai-card-visual { padding-bottom: 80px; }
  
  .bento-row { flex-direction: column; height: auto; }
  .bento-card { min-height: 240px; }
  .bento-bg-icon { top: 0 !important; right: -40px !important; left: auto !important; }
  
  .workflow-grid { flex-direction: column; }
  .wf-arrow { transform: rotate(90deg); }
  
  .pricing-cards { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; gap: 40px; }
  .sticky-bg { display: none; }
  .raise-up { transform: none; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
  
  .footer-top { flex-direction: column; }
}
</style>
