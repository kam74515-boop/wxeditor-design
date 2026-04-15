<template>
  <div class="editor-workbench">
    <!-- 1. 左侧栏：用户信息与面板区（拆分为三个独立卡区） -->
    <aside class="left-sider-card">
      
      <!-- 1.1 独立的用户卡片 block -->
      <div class="sider-block user-login-card">
        <div class="user-avatar">
          <span class="avatar-text">{{ userStore.userInitial }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '用户' }}</span>
          <span class="user-role">{{ userStore.isLoggedIn ? '已登录' : '未登录' }} · 微信公众号编辑</span>
        </div>
        <BackButton to="/projects" label="项目列表" variant="ghost" size="sm" :show-label="true" />
      </div>

      <!-- 1.2 独立的便签+项目组 (负责容纳 Tab 及变色框) -->
      <div class="sider-block tabs-card-group">
        <nav class="tool-tabs">
          <div class="tab-item" :class="{ active: activeTab === 'templates' }" @click="activeTab = 'templates'" style="background-color: #BAE6FD;">模版</div>
          <div class="tab-item" :class="{ active: activeTab === 'svg' }" @click="activeTab = 'svg'" style="background-color: #DDD6FE;">SVG</div>
          <div class="tab-item" :class="{ active: activeTab === 'assets' }" @click="activeTab = 'assets'" style="background-color: #A7F3D0;">素材</div>
          <div class="tab-item" :class="{ active: activeTab === 'upload' }" @click="activeTab = 'upload'" style="background-color: #E5E7EB;">上传</div>
          <div class="tab-item" :class="{ active: activeTab === 'project' }" @click="activeTab = 'project'" style="background-color: #FED7AA;">项目</div>
          <div class="tab-item" :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'" style="background-color: #FBCFE8;">AI</div>
        </nav>

        <div class="tab-content" :style="{ backgroundColor: activeTabColor }">
          <div v-if="activeTab === 'ai'" class="ai-prompts-panel">
            <div class="ai-prompts-header">
              <span class="ai-label"><svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" style="vertical-align:-2px;margin-right:4px;"><path d="M10 2a6 6 0 0 0-6 6c0 2.2 1.2 4.1 3 5.1V15a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.9c1.8-1 3-2.9 3-5.1a6 6 0 0 0-6-6zm-1 15h2v1H9v-1z"/></svg>AI 快捷操作</span>
            </div>
            <!-- 快捷操作按钮 -->
            <div class="ai-templates-grid">
              <button
                v-for="tpl in aiPromptTemplates"
                :key="tpl.id"
                class="ai-tpl-btn"
                :disabled="aiStore.isLoading"
                @click="handleAIQuickPrompt(tpl)"
              >
                <span class="tpl-icon">{{ tpl.icon }}</span>
                <span class="tpl-label">{{ tpl.label }}</span>
              </button>
            </div>
            <p style="font-size:0.7rem;color:rgba(0,0,0,0.4);padding:8px;text-align:center;">在右侧 AI 助手内对话、上传文件</p>
          </div>
          <!-- 其他标签页 placeholder -->
          <div v-else class="placeholder-text">
            在这里开始写作...<br/><br/>
            - 支持精细化排版展示<br/>
            - 支持将微组件植入（拖入）<br/>
            - 支持一键生成公众号代码
          </div>
        </div>
      </div>

      <!-- 1.3 底部文章信息栏：标题 + 作者 + 封面图 -->
      <div class="sider-block article-info-card">
        <div class="info-field">
          <label class="field-label">文章标题</label>
          <input 
            v-model="articleTitle"
            class="field-input" 
            placeholder="请输入文章标题"
            @input="handleTitleChange"
          />
        </div>
        <div class="info-field">
          <label class="field-label">作者</label>
          <input class="field-input" placeholder="请输入作者名称" />
        </div>
        <button class="cover-upload-btn">
          <el-icon><Picture /></el-icon>
          <div class="btn-text">
            <strong>上传封面图</strong>
            <span>支持按比例（裁剪），不保留<br/>原图长宽比自动拉伸。</span>
          </div>
        </button>
      </div>
      
    </aside>

    <!-- 2. 中间主编辑区 -->
    <main class="center-editor-card" :class="{ 'mobile-preview': previewMode === 'mobile' }">
      <!-- UEditor 工具栏（独立容器，不受手机预览影响） -->
      <div ref="toolbarAreaRef" class="editor-toolbar-area"></div>
      <!-- UEditor 编辑内容区 -->
      <div class="editor-content-area">
        <div ref="editorRef" id="ueditor-container"></div>
      </div>
      <!-- 悬浮状态信息 -->
      <div class="editor-status-float">
        <span v-if="currentProject?.id" class="status-item project-id" :title="currentProject.id">
          #{{ currentProject.id.slice(0, 8) }}
        </span>
        <span v-if="currentProject?.id" class="status-item divider"></span>
        <span class="status-item">{{ article.word_count || 0 }} 字</span>
        <span class="status-item divider"></span>
        <template v-if="editorStore.autoSaving || editorStore.isSaving">
          <el-icon class="is-loading" style="color: #6B7280; font-size: 13px; margin-right: 4px;"><Loading /></el-icon>
          <span class="status-text" style="color: #6B7280;">保存中...</span>
        </template>
        <template v-else-if="editorStore.hasUnsavedChanges">
          <span class="status-dot" style="background-color: #F59E0B;"></span>
          <span class="status-text" style="color: #6B7280;">未保存修改</span>
        </template>
        <template v-else-if="editorStore.lastSavedAt">
          <span class="status-dot" style="background-color: #10B981;"></span>
          <span class="status-text" style="color: #10B981;">已存至云端 ({{ formatTime(editorStore.lastSavedAt) }})</span>
        </template>
        <template v-else>
          <span class="status-dot"></span>
          <span class="status-text">无草稿</span>
        </template>
      </div>
    </main>

    <!-- 图片悬浮工具栏 -->
    <div 
      v-if="imageToolbar.visible" 
      class="image-float-toolbar"
      :style="{ left: imageToolbar.x + 'px', top: imageToolbar.y + 'px' }"
    >
      <button class="image-float-btn" @click="handleImageToolbarAction('crop')">
        <el-icon><Crop /></el-icon> 裁剪
      </button>
      <button class="image-float-btn" @click="handleImageToolbarAction('replace')">
        <el-icon><Picture /></el-icon> 替换
      </button>
      <button class="image-float-btn" @click="handleImageToolbarAction('autofit')">
        <el-icon><FullScreen /></el-icon> 自适应
      </button>
    </div>

    <!-- 3. 右侧面板 -->
    <aside class="right-panel">
      <!-- 3.0 独立操作栏 block -->
      <div class="sider-block action-bar-card">
        <!-- 左侧区域：针对编辑器本身的微操 -->
        <div class="action-bar-left">
          <div class="action-group">
            <button class="action-icon-btn" title="撤销" @click="execUndoRedo('undo')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="action-icon-btn" title="重做" @click="execUndoRedo('redo')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </div>

        <!-- 右侧区域：核心功能与次要功能折叠 -->
        <div class="action-bar-right">
          <div class="action-group">
            <!-- 刚需功能保留在外 -->
            <button class="action-icon-btn" title="预览" @click="handlePreview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-icon-btn" :class="{ active: showCommentPanel }" title="评论批注" @click="showCommentPanel = !showCommentPanel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </button>
            
            <!-- 非刚需折叠菜单 -->
            <el-dropdown trigger="click" placement="bottom-end">
              <button class="action-icon-btn" title="更多操作">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="togglePreviewMode">
                    <span style="display:flex;align-items:center;gap:6px;">
                      <el-icon><Monitor v-if="previewMode === 'mobile'" /><Phone v-else /></el-icon>
                      {{ previewMode === 'mobile' ? '切换为电脑视图' : '切换为手机视图' }}
                    </span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleNewChat">
                    <span style="display:flex;align-items:center;gap:6px;">
                      <el-icon><ChatLineSquare /></el-icon>
                      新建对话
                    </span>
                  </el-dropdown-item>
                  <el-dropdown-item @click="showChatHistory = !showChatHistory">
                    <span style="display:flex;align-items:center;gap:6px;">
                      <el-icon><Clock /></el-icon>
                      历史对话
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="action-bar-divider"></div>

          <!-- 极高频核心动作 -->
          <button class="action-btn primary-btn" @click="() => {}">
            <el-icon><Position /></el-icon> 发布
          </button>
        </div>
      </div>

      <!-- 裁剪图片弹窗 -->
      <el-dialog v-model="cropDialog.visible" title="裁剪图片" width="600px" destroy-on-close>
        <div style="height: 400px; width: 100%; display: flex; justify-content: center; background: #fafafa;">
          <vue-cropper
            ref="cropperRef"
            :img="cropDialog.imageUrl"
            :autoCrop="true"
            :fixedBox="false"
            :centerBox="true"
            mode="contain"
          />
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="cropDialog.visible = false">取消</el-button>
            <el-button type="primary" @click="handleCropSubmit" :loading="cropDialog.loading">确定裁剪并替换</el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 历史对话悬浮窗 -->
      <div v-if="showChatHistory" class="chat-history-overlay" @click.self="showChatHistory = false">
        <div class="chat-history-popup">
          <div class="chat-history-header">
            <span>历史对话</span>
            <button class="chat-history-close" @click="showChatHistory = false"><el-icon><Close /></el-icon></button>
          </div>
          <div class="chat-history-body">
            <div v-if="chatHistoryList.length === 0" class="chat-history-empty">暂无历史对话</div>
            <div v-for="(item, idx) in chatHistoryList" :key="idx" class="chat-history-item" @click="loadChatHistory(idx)">
              <div class="chat-history-info">
                <span class="chat-history-label">{{ item.title }}</span>
                <span class="chat-history-time">{{ item.time }}</span>
              </div>
              <button class="chat-history-del" @click.stop="deleteChatHistory(idx)" title="删除"><el-icon><Close /></el-icon></button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showToolRunReview" class="chat-history-overlay" @click.self="showToolRunReview = false">
        <div class="tool-run-popup">
          <div class="chat-history-header">
            <span>生成记录</span>
            <button class="chat-history-close" @click="showToolRunReview = false"><el-icon><Close /></el-icon></button>
          </div>
          <div class="tool-run-toolbar">
            <span class="tool-run-toolbar-meta">
              {{ currentAiDocumentId ? `文档：#${currentAiDocumentId.slice(0, 8)}` : '当前未绑定文档' }}
            </span>
            <button class="tool-run-refresh" :disabled="toolRunHistoryLoading || !currentAiDocumentId" @click="loadToolRunHistory(true)">
              {{ toolRunHistoryLoading ? '加载中...' : '刷新' }}
            </button>
          </div>
          <div class="tool-run-body">
            <div v-if="toolRunHistoryLoading" class="tool-run-empty">正在加载生成记录...</div>
            <div v-else-if="toolRunHistoryError" class="tool-run-empty tool-run-error">{{ toolRunHistoryError }}</div>
            <div v-else-if="toolRunHistoryList.length === 0" class="tool-run-empty">当前文档还没有生成记录</div>
            <details
              v-for="item in toolRunHistoryList"
              :key="item.id"
              class="tool-run-item"
            >
              <summary class="tool-run-summary">
                <div class="tool-run-summary-main">
                  <span class="tool-run-name">{{ item.tool_name }}</span>
                  <span v-if="item.model" class="tool-run-model">{{ item.model }}</span>
                </div>
                <span class="tool-run-time">{{ formatToolRunTime(item.created_at) }}</span>
              </summary>
              <div class="tool-run-content">
                <div v-if="item.reply" class="tool-run-reply">
                  <span class="tool-run-block-title">文本回复</span>
                  <p>{{ item.reply }}</p>
                </div>
                <div class="tool-run-block">
                  <span class="tool-run-block-title">原始参数</span>
                  <pre>{{ formatToolRunPayload(item.raw_args) }}</pre>
                </div>
                <div class="tool-run-block">
                  <span class="tool-run-block-title">收口后参数</span>
                  <pre>{{ formatToolRunPayload(item.normalized_args) }}</pre>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <!-- 3.1 AI 助手区（完整交互面板） -->
      <div class="right-ai-card">
        <div class="ai-panel-toolbar">
          <div class="ai-panel-title">
            <span>AI 助手</span>
            <span v-if="currentAiDocumentId" class="ai-panel-doc">#{{ currentAiDocumentId.slice(0, 8) }}</span>
          </div>
          <button
            class="ai-panel-link"
            :disabled="toolRunHistoryLoading || !currentAiDocumentId"
            @click="openToolRunReview"
          >
            {{ toolRunHistoryLoading && showToolRunReview ? '刷新中...' : '生成记录' }}
          </button>
        </div>

        <!-- 消息流 -->
        <div class="ai-content">
          <template v-for="msg in aiStore.messages" :key="msg.id">
            <!-- AI 消息：先显示思维链，再显示正文 -->
            <template v-if="msg.role === 'assistant'">
              <!-- 思维链：当前消息正在思考 或 已有历史思维链 -->
              <details 
                v-if="(msg.id === aiStore.currentAiMsgId && aiStore.thinkingText) || msg.thinking"
                class="ai-thinking-minimal" 
                :open="msg.id === aiStore.currentAiMsgId && aiStore.isThinking"
              >
                <summary class="thinking-summary-minimal">
                  <span class="chevron-arrow">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                  {{ msg.id === aiStore.currentAiMsgId && aiStore.isThinking ? `Thought for ${aiStore.streamStats.elapsed}s` : 'Thought process' }}
                </summary>
                <div class="thinking-content-minimal" v-html="formatAIReply(msg.id === aiStore.currentAiMsgId ? aiStore.thinkingText : (msg.thinking || ''))"></div>
              </details>
              <!-- AI 正文 -->
              <div v-show="msg.content" class="ai-msg assistant">
                <div class="ai-msg-bubble" v-html="formatAIReply(msg.content)"></div>
              </div>
            </template>
            <!-- 用户消息 -->
            <div v-else-if="msg.content" :class="['ai-msg', msg.role]">
              <div class="ai-msg-bubble" v-html="formatAIReply(msg.content)"></div>
            </div>
          </template>

          <!-- 极简状态指示（多阶段） -->
          <div v-if="aiStore.isLoading && aiStore.streamPhase === 'thinking'" class="ai-status-minimal">
            Thinking...
          </div>
          <div v-else-if="aiStore.isLoading && aiStore.streamPhase === 'generating'" class="ai-status-minimal">
            Generating...
          </div>
          <div v-else-if="aiStore.isLoading && aiStore.streamPhase === 'executing'" class="ai-status-minimal ai-status-tool">
            Executing {{ aiStore.currentToolName }}...
          </div>
        </div>

        <!-- 附件预览 -->
        <div v-if="aiStore.attachedFile" class="ai-file-bar">
          <span><svg viewBox="0 0 20 20" width="12" height="12" fill="#2563eb" style="vertical-align:-1px;margin-right:3px;"><path d="M15.6 4.4a1.5 1.5 0 0 0-2.1 0L5 12.9V15h2.1l8.5-8.5a1.5 1.5 0 0 0 0-2.1zM3 17h14v1H3v-1z"/></svg> {{ aiStore.attachedFile.name }}</span>
          <button @click="aiStore.attachedFile = null"><el-icon><Close /></el-icon></button>
        </div>

        <!-- 输入区 -->
        <div class="ai-input">
          <div class="ai-input-row">
            <button class="attach-btn" @click="triggerFileInput" :disabled="aiStore.isLoading" title="上传文件"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M15.6 4.4a1.5 1.5 0 0 0-2.1 0L5 12.9V15h2.1l8.5-8.5a1.5 1.5 0 0 0 0-2.1zM3 17h14v1H3v-1z"/></svg></button>
            <input
              v-model="chatInput"
              type="text"
              placeholder="输入指令或上传文件..."
              class="chat-input"
              :disabled="aiStore.isLoading"
              @keyup.enter="handleSendAI"
              @keyup.esc="aiStore.stopGeneration()"
              @paste="handlePaste"
            />
            <button v-if="aiStore.isLoading" class="stop-btn-round" @click="aiStore.stopGeneration()" title="停止生成">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>
            </button>
            <button v-else class="send-btn" :disabled="(!chatInput.trim() && !aiStore.attachedFile)" @click="handleSendAI">
              <el-icon><Promotion /></el-icon>
            </button>
          </div>
          <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx,.html,.htm,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg" style="display:none" @change="handleFileSelect" />
        </div>
        <div v-if="aiStore.availableModels.length" ref="aiModelMenuRef" class="ai-input-meta">
          <button
            type="button"
            class="ai-model-trigger"
            :class="{ open: aiModelMenuOpen }"
            :disabled="aiStore.isLoading || aiStore.availableModels.length <= 1"
            @click="toggleAIModelMenu"
          >
            <span class="ai-model-trigger-text">{{ selectedAIModelDisplayName }}</span>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </button>
          <div v-if="aiModelMenuOpen" class="ai-model-menu">
            <button
              v-for="model in aiStore.availableModels"
              :key="model.id"
              type="button"
              class="ai-model-option"
              :class="{ active: model.id === aiStore.selectedModel }"
              @click="selectAIModel(model.id)"
            >
              <span class="ai-model-option-provider">{{ aiStore.modelProviderLabel || '模型厂商' }}</span>
              <span class="ai-model-option-name">{{ model.display_name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 图片悬浮工具栏 (完全自定义，替代 UEditor 原生 popup) -->
      <div v-if="imageToolbar.visible" class="image-float-toolbar" :style="{ left: imageToolbar.x + 'px', top: imageToolbar.y + 'px' }">
        <button class="image-float-btn" @click.stop="handleImageToolbarAction('crop')">
          <el-icon><Crop /></el-icon> 裁剪
        </button>
        <button class="image-float-btn" @click.stop="handleImageToolbarAction('replace')">
          <el-icon><Picture /></el-icon> 替换
        </button>
        <button class="image-float-btn" @click.stop="handleImageToolbarAction('autofit')">
          <el-icon><FullScreen /></el-icon> 自适应
        </button>
      </div>
    </aside>

    <!-- 评论批注面板 -->
    <CommentPanel
      :visible="showCommentPanel"
      :document-id="commentDocumentId"
      @close="showCommentPanel = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch, reactive, ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useEditorStore, useAIStore, useUserStore } from '@/stores';
import { initUEditor, destroyUEditor } from '@/utils';
import { injectCustomColorPicker } from '@/utils/color-picker';
import { injectLucideIcons } from '@/utils/ueditor-icons';
import { Picture, Position, Promotion, Loading, Crop, FullScreen, Close } from '@element-plus/icons-vue';
import { promptTemplates as aiPromptTemplates } from '@/stores/ai';
import type { PromptTemplate } from '@/stores/ai';
import type { ChatMessage, UEditorInstance } from '@/types';
import http from '@/utils/http';
import { ElMessage, ElMessageBox } from 'element-plus';
import 'vue-cropper/dist/index.css';
import { VueCropper } from 'vue-cropper';
import BackButton from '@/components/navigation/BackButton.vue';
import CommentPanel from '@/components/editor/CommentPanel.vue';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore();
const aiStore = useAIStore();
const userStore = useUserStore();

onBeforeRouteLeave(async (_to, _from, next) => {
  if (!editorStore.hasUnsavedChanges) return next();
  try {
    await ElMessageBox.confirm(
      '当前文档有未保存的修改，是否保存后离开？',
      '未保存的修改',
      {
        confirmButtonText: '保存并离开',
        cancelButtonText: '放弃修改',
        distinguishCancelAndClose: true,
        type: 'warning',
      }
    );
    await editorStore.save();
    next();
  } catch (action: any) {
    if (action === 'cancel') next();
    else next(false);
  }
});

// 裁剪状态
const cropperRef = ref<any>(null);
const cropDialog = reactive({
  visible: false,
  imageUrl: '',
  loading: false,
  imgNode: null as HTMLImageElement | null
});

// 图片悬浮工具栏状态
const imageToolbar = reactive({
  visible: false,
  x: 0,
  y: 0,
  target: null as HTMLImageElement | null
});

// 处理图片操作
async function handleImageToolbarAction(action: string) {
  if (!imageToolbar.target || !ueditorInstance) return;
  const img = imageToolbar.target;

  if (action === 'autofit') {
    img.style.width = '100%';
    img.style.height = 'auto';
    img.removeAttribute('width');
    img.removeAttribute('height');
    ueditorInstance.fireEvent('contentchange');
    debouncedSave();
    ElMessage.success('已设为自适应宽度');
    imageToolbar.visible = false;
  } else if (action === 'replace') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('upfile', file);
      try {
        const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/ueditor?action=uploadimage', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.state === 'SUCCESS') {
          img.src = data.url;
          ueditorInstance!.fireEvent('contentchange');
          debouncedSave();
          ElMessage.success('图片替换成功');
          imageToolbar.visible = false;
        } else {
          ElMessage.error(data.state || '上传失败');
        }
      } catch (err) {
        ElMessage.error('上传图片发生错误');
      }
    };
    input.click();
  } else if (action === 'crop') {
    imageToolbar.visible = false;
    cropDialog.imgNode = img;
    cropDialog.imageUrl = img.src;
    cropDialog.visible = true;
  }
}

// 提交裁剪
async function handleCropSubmit() {
  if (!cropperRef.value || !cropDialog.imgNode) return;
  cropDialog.loading = true;
  cropperRef.value.getCropBlob(async (data: Blob) => {
    if (data) {
      const file = new File([data], 'cropped.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('upfile', file);
      
      try {
        const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/ueditor?action=uploadimage', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        
        if (json.state === 'SUCCESS') {
          cropDialog.imgNode!.src = json.url;
          ueditorInstance!.fireEvent('contentchange');
          debouncedSave();
          ElMessage.success('图片裁剪成功');
          cropDialog.visible = false;
        } else {
          ElMessage.error(json.state || '上传失败');
        }
      } catch (err) {
        ElMessage.error('上传裁剪图片发生错误');
      } finally {
        cropDialog.loading = false;
      }
    } else {
      cropDialog.loading = false;
      ElMessage.error('获取裁剪图片失败');
    }
  });
}

const { currentProject, article } = storeToRefs(editorStore);

const editorRef = ref<HTMLElement | null>(null);
const toolbarAreaRef = ref<HTMLElement | null>(null);
const articleTitle = ref(article.value.title || '');
const chatInput = ref('');
let ueditorInstance: UEditorInstance | null = null;

// ---- 聊天历史管理 ----
interface ChatHistoryItem {
  title: string;
  time: string;
  messages: ChatMessage[];
}

interface ToolRunItem {
  id: number;
  tool_name: string;
  tool_call_id?: string | null;
  raw_args: string;
  normalized_args: unknown;
  reply?: string | null;
  model?: string | null;
  created_at?: string;
}

const showChatHistory = ref(false);
const chatHistoryList = ref<ChatHistoryItem[]>([]);
const showToolRunReview = ref(false);
const toolRunHistoryList = ref<ToolRunItem[]>([]);
const toolRunHistoryLoading = ref(false);
const toolRunHistoryError = ref('');

// 从 localStorage 加载历史记录
function loadChatHistoryFromStorage() {
  try {
    const raw = localStorage.getItem('ai-chat-history');
    if (raw) chatHistoryList.value = JSON.parse(raw);
  } catch { /* 忽略 */ }
}
loadChatHistoryFromStorage();

function saveChatHistoryToStorage() {
  // 最多保存 20 条历史对话
  const trimmed = chatHistoryList.value.slice(0, 20);
  localStorage.setItem('ai-chat-history', JSON.stringify(trimmed));
}

// 新建对话：保存当前到历史，清空消息
function handleNewChat() {
  // 如果当前对话有内容，先保存到历史
  if (aiStore.messages.length > 1) {
    const firstUserMsg = aiStore.messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
      : '对话 ' + new Date().toLocaleTimeString();
    chatHistoryList.value.unshift({
      title,
      time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      messages: [...aiStore.messages],
    });
    saveChatHistoryToStorage();
  }
  aiStore.clearMessages();
  // 添加默认欢迎消息
  aiStore.messages.push({
    id: String(Date.now()),
    role: 'assistant',
    content: '你好！新对话已开始。\n\n试试对我说：\n• "写一篇关于 XX 的文章"\n• "润色一下当前文章"',
    timestamp: new Date(),
  });
  showChatHistory.value = false;
}

// 加载历史对话
function loadChatHistory(idx: number) {
  // 先保存当前对话
  if (aiStore.messages.length > 1) {
    const firstUserMsg = aiStore.messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
      : '当前对话';
    chatHistoryList.value.push({
      title,
      time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      messages: [...aiStore.messages],
    });
  }
  // 恢复选中的历史对话
  const item = chatHistoryList.value[idx];
  aiStore.clearMessages();
  aiStore.messages.push(...item.messages);
  // 从历史中移除（已加载为当前）
  chatHistoryList.value.splice(idx, 1);
  saveChatHistoryToStorage();
  showChatHistory.value = false;
}

// 删除历史对话
function deleteChatHistory(idx: number) {
  chatHistoryList.value.splice(idx, 1);
  saveChatHistoryToStorage();
}

const activeTab = ref('templates');
const previewMode = ref<'desktop' | 'mobile'>('desktop');
const showCommentPanel = ref(false);
const commentDocumentId = computed(() => (route.params.documentId as string) || currentProject.value?.id || '');
const currentAiDocumentId = computed(() => (route.params.documentId as string) || currentProject.value?.id || '');
const tabColors: Record<string, string> = {
  templates: '#BAE6FD',
  svg: '#DDD6FE',
  assets: '#A7F3D0',
  upload: '#E5E7EB',
  project: '#FED7AA',
  ai: '#FBCFE8'
};
const activeTabColor = computed(() => tabColors[activeTab.value]);

function formatTime(date: Date | null | string): string {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatToolRunTime(value?: string): string {
  if (!value) return '刚刚';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatToolRunPayload(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

async function loadToolRunHistory(force = false) {
  if (!currentAiDocumentId.value) {
    toolRunHistoryList.value = [];
    toolRunHistoryError.value = '';
    return;
  }

  if (toolRunHistoryLoading.value) return;
  if (!force && toolRunHistoryList.value.length > 0) return;

  toolRunHistoryLoading.value = true;
  toolRunHistoryError.value = '';

  try {
    const res: any = await http.get(`/ai/history/${currentAiDocumentId.value}/tool-runs?limit=20`);
    if (res.success) {
      toolRunHistoryList.value = Array.isArray(res.data) ? res.data : [];
    } else {
      toolRunHistoryList.value = [];
      toolRunHistoryError.value = res.message || '加载生成记录失败';
    }
  } catch (error: any) {
    toolRunHistoryList.value = [];
    toolRunHistoryError.value = error?.response?.data?.message || error?.message || '加载生成记录失败';
  } finally {
    toolRunHistoryLoading.value = false;
  }
}

async function openToolRunReview() {
  if (!currentAiDocumentId.value) {
    ElMessage.info('当前文档还没有可查看的生成记录');
    return;
  }

  showToolRunReview.value = true;
  await loadToolRunHistory(true);
}

import { debounce } from 'lodash-es';

// 防抖自动保存（延迟 2000ms）
const debouncedSave = debounce(async () => {
  if (!editorStore.hasUnsavedChanges || editorStore.isSaving) return;
  editorStore.autoSaving = true;
  try {
    await editorStore.save();
    // 如果是新建后第一次保存，URL 中可能还没有 documentId，需要更新
    if (currentProject.value?.id && !route.params.documentId) {
      router.replace(`/editor/${currentProject.value.id}`);
    }
  } catch (err) {
    console.error('自动保存失败:', err);
  } finally {
    editorStore.autoSaving = false;
  }
}, 2000);

/**
 * 根据路由参数加载已有文档，或创建新文档
 */
/**
 * 使用原始 setContent（不触发防抖保存）将内容写入编辑器
 */
function setEditorContentRaw(content: string) {
  if (!ueditorInstance) return;
  const rawSet = (ueditorInstance as any)._originalSetContent;
  if (rawSet) rawSet(content);
  else ueditorInstance.setContent(content);
}

async function loadOrCreateDocument() {
  debouncedSave.cancel();
  if (editorStore.hasUnsavedChanges && editorStore.currentProject?.id) {
    try { await editorStore.save(); } catch {}
  }

  const documentId = route.params.documentId as string | undefined;

  if (documentId) {
    try {
      const res: any = await http.get(`/collab/documents/${documentId}`);
      if (res.success && res.data) {
        editorStore.setProject({
          id: res.data.id,
          title: res.data.title,
          status: res.data.status || 'draft',
          updatedAt: new Date(res.data.updated_at),
          createdAt: new Date(res.data.created_at),
        });
        editorStore.updateArticle({
          title: res.data.title,
          content: res.data.content || '',
          summary: res.data.summary || '',
        });
        editorStore.hasUnsavedChanges = false;
        articleTitle.value = res.data.title || '';
        // 切换 AI 上下文到当前文档（清空旧聊天 + 加载历史）
        aiStore.switchDocument(documentId);
        if (ueditorInstance) {
          ueditorInstance.ready(() => {
            setEditorContentRaw(res.data.content || '');
          });
        }
      }
    } catch (err) {
      console.error('加载文档失败:', err);
    }
  } else {
    editorStore.updateArticle({ title: '', content: '', summary: '' });
    editorStore.hasUnsavedChanges = false;
    articleTitle.value = '';
    aiStore.switchDocument('');
    if (ueditorInstance) {
      setEditorContentRaw('');
    }

    try {
      const newProject = await editorStore.createProject('未命名文档');
      if (newProject?.id) {
        // 用 replace 替换当前 URL，防止用户"后退"再次触发新建
        router.replace(`/editor/${newProject.id}`);
      }
    } catch (err) {
      console.error('创建文档失败:', err);
    }
  }
}

// 初始化编辑器
onMounted(async () => {
  document.addEventListener('pointerdown', handleAIModelClickOutside);
  aiStore.loadAvailableModels();

  // 如果 URL 没有 documentId，说明要新建文档，先清掉持久化残留内容
  const hasDocumentId = !!route.params.documentId;
  if (!hasDocumentId) {
    editorStore.updateArticle({ title: '', content: '', summary: '' });
    articleTitle.value = '';
  }

  if (editorRef.value) {
    try {
      ueditorInstance = await initUEditor('ueditor-container', {
        initialContent: hasDocumentId ? (article.value.content || '') : '',
        initialFrameHeight: 500,
        // @ts-ignore
        imagePopup: false, // 禁用 UEditor 原生图片悬浮提示，使用我们自定义的悬浮工具栏
      });
      
      // 监听内容变化 + 注入操作按钮到工具栏
      const editor = ueditorInstance;
      if (!editor) return;

      editor.ready(() => {
        editor.execCommand('serverparam', {
          projectId: currentProject.value?.id || '',
        });

        // 注入全量最新现代扁平化 Lucide SVGs 图标覆盖原有背景图!
        injectLucideIcons(editor);

        // 注入自定义对齐循环按钮到工具栏
        injectAlignmentButton(editor);
        
        // 注入自定义颜色选择器（替代 UEditor 原生 ColorPicker）
        injectCustomColorPicker(editor);
        
        // 将工具栏移到独立容器中，与编辑内容区分离
        const toolbarBox = document.querySelector('#ueditor-container .edui-editor-toolbarbox');
        if (toolbarBox && toolbarAreaRef.value) {
          toolbarAreaRef.value.appendChild(toolbarBox);
        }
        
        // 设置内容变化回调
        const originalSetContent = editor.setContent.bind(editor);
        // 保存原始 setContent 引用供流式渲染使用（不触发保存）
        (editor as any)._originalSetContent = originalSetContent;
        editor.setContent = (content: string, isAppend?: boolean) => {
          editorStore.setContent(content);
          // 触发防抖保存
          debouncedSave();
          return originalSetContent(content, isAppend);
        };

        // 监听图片点击和选取以显示悬浮工具栏
        // 兜底原生事件：强制 UEditor 选中被点击的图片，防止复杂嵌套下选中判定丢失
        if (editor.document) {
          editor.document.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'IMG') {
              const range = editor.selection.getRange();
              range.selectNode(target).select();
            }
          });
        }
        editor.addListener('selectionchange', () => {
          const range = editor.selection.getRange();
          const closedNode = range.getClosedNode();
          const startNode = editor.selection.getStart();
          
          let imgNode = null;
          if (closedNode && closedNode.tagName === 'IMG') {
            imgNode = closedNode;
          } else if (startNode && startNode.tagName === 'IMG') {
            imgNode = startNode;
          }
          
          if (imgNode) {
            const iframe = editor.iframe;
            if (iframe) {
              const rect = imgNode.getBoundingClientRect();
              const iframeRect = iframe.getBoundingClientRect();
              
              imageToolbar.x = iframeRect.left + rect.left + (rect.width / 2);
              
              // 默认放图片上方
              let top = iframeRect.top + rect.top;
              if (top < 60) top = iframeRect.top + rect.bottom + 40; // 如果上方空间不足，放到下方

              imageToolbar.y = top;
              imageToolbar.target = imgNode as HTMLImageElement;
              imageToolbar.visible = true;
              return;
            }
          }
          
          imageToolbar.visible = false;
          imageToolbar.target = null;
        });

        // 编辑器滚动时隐藏图片悬浮栏
        if (editor.window) {
          editor.window.addEventListener('scroll', () => {
            imageToolbar.visible = false;
          }, { passive: true });
        }

        // 编辑器就绪后，根据路由加载或新建文档
        loadOrCreateDocument();
      });
    } catch (error) {
      console.error('UEditor 初始化失败:', error);
    }
  }
  // 启动自动保存（防抖 + 心跳 + beforeunload）
  editorStore.setupAutoSave();
});

// 路由参数变化时重新加载文档（Vue Router 复用组件实例时触发）
watch(() => route.params.documentId, (newId, oldId) => {
  if (newId !== oldId && ueditorInstance) {
    loadOrCreateDocument();
  }
});

// 监听标题变化
watch(articleTitle, (newTitle) => {
  editorStore.setTitle(newTitle);
});

// 组件卸载前销毁编辑器
onBeforeUnmount(() => {
  // 销毁自动保存定时器和事件监听
  editorStore.teardownAutoSave();
  if (ueditorInstance) {
    destroyUEditor('ueditor-container');
  }
});

// 对齐按钮 SVG 图标
const alignIcons: Record<string, string> = {
  justifyleft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
  justifycenter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',
  justifyright: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
  justifyjustify: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>',
};
const alignCmds = ['justifyleft', 'justifycenter', 'justifyright', 'justifyjustify'] as const;
const alignLabels: Record<string, string> = {
  justifyleft: '左对齐', justifycenter: '居中', justifyright: '右对齐', justifyjustify: '两端对齐'
};

// 注入对齐循环按钮到 UEditor 工具栏
function injectAlignmentButton(editor: UEditorInstance) {
  let currentIdx = 0;
  const toolbar = document.querySelector('.edui-toolbar');
  if (!toolbar) return;

  // 防御性：避免热重载或反复触发 ready 事件导致多次注入多个按钮
  if (toolbar.querySelector('.custom-align-btn')) return;

  // 找到 backcolor 按钮后的位置
  const backcolorBtn = toolbar.querySelector('.edui-for-backcolor');
  
  // 创建按钮
  const btn = document.createElement('div');
  btn.className = 'custom-align-btn';
  btn.title = alignLabels[alignCmds[currentIdx]];
  btn.innerHTML = alignIcons[alignCmds[currentIdx]];
  btn.addEventListener('click', () => {
    // 执行当前对齐命令
    editor.execCommand(alignCmds[currentIdx]);
    // 切换到下一个
    currentIdx = (currentIdx + 1) % alignCmds.length;
    btn.innerHTML = alignIcons[alignCmds[currentIdx]];
    btn.title = alignLabels[alignCmds[currentIdx]];
  });

  // 插入到工具栏
  if (backcolorBtn?.nextSibling) {
    toolbar.insertBefore(btn, backcolorBtn.nextSibling);
  } else {
    toolbar.appendChild(btn);
  }
}

// 撤销/重做
function execUndoRedo(cmd: 'undo' | 'redo') {
  if (ueditorInstance) {
    ueditorInstance.execCommand(cmd);
  }
}

function handleTitleChange() {
  editorStore.setTitle(articleTitle.value);
  debouncedSave();
}

const aiModelMenuOpen = ref(false);
const aiModelMenuRef = ref<HTMLElement | null>(null);
const selectedAIModelDisplayName = computed(() => {
  const currentModel = aiStore.availableModels.find((model) => model.id === aiStore.selectedModel);
  return currentModel?.display_name || aiStore.modelProviderLabel || '选择模型';
});

function toggleAIModelMenu() {
  if (aiStore.isLoading || aiStore.availableModels.length <= 1) return;
  aiModelMenuOpen.value = !aiModelMenuOpen.value;
}

function selectAIModel(modelId: string) {
  aiStore.setSelectedModel(modelId);
  aiModelMenuOpen.value = false;
}

function handleAIModelClickOutside(event: PointerEvent) {
  const target = event.target as Node | null;
  if (!target || !aiModelMenuRef.value?.contains(target)) {
    aiModelMenuOpen.value = false;
  }
}

// AI 发送消息（右侧聊天面板，支持附件）
function handleSendAI() {
  const text = chatInput.value.trim();
  const file = aiStore.attachedFile;
  if ((!text && !file) || aiStore.isLoading) return;
  chatInput.value = '';



  const editorContent = ueditorInstance?.getContent?.() || '';
  const prompt = text || '请分析并处理这个文件的内容，将其排版后写入编辑器';
  const docId = currentProject.value?.id || editorStore.currentProject?.id;
  aiStore.sendMessage(prompt, editorContent, file || undefined, docId);
  aiStore.attachedFile = null;
}

// AI 快捷提示词发送（左侧 AI tab）
function handleAIQuickPrompt(tpl: PromptTemplate) {
  const content = ueditorInstance?.getContent?.() || article.value.content || '';
  const docId = currentProject.value?.id || editorStore.currentProject?.id;
  aiStore.sendQuickPrompt(tpl, content, docId);
}

// 文件上传相关
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    aiStore.attachedFile = input.files[0];
  }
  input.value = ''; // 重置，允许重复选择同一文件
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image/') !== -1) {
      const file = item.getAsFile();
      if (file) {
        aiStore.attachedFile = file;
        e.preventDefault(); // 阻止浏览器默认将图片名等粘贴到文本框，或者阻止二次触发
        break; // 每次粘贴只提取第一张图
      }
    } else if (item.kind === 'file') {
       // 支持粘贴其他文件类型如 pdf/doc 等，虽然相对少见
       const file = item.getAsFile();
       if (file) {
         aiStore.attachedFile = file;
         e.preventDefault();
         break;
       }
    }
  }
}

// 格式化 AI 回复（将换行转 br，代码块简单高亮，禁止渲染原生 HTML 标签）
function formatAIReply(text: string): string {
  // 对普通文本做基础的 Markdown 代码块高亮，并替换换行
  let formatted = text
    .replace(/```[\s\S]*?```/g, match => `<pre style="background:#f6f7f8;padding:8px;border-radius:6px;font-size:12px;overflow-x:auto;margin:4px 0;">${match.replace(/```\w*\n?/g, '').replace(/```/g, '')}</pre>`);
  
  // 防止残留的非包裹类 HTML 标签（如 <br> 即便不完整）泄露或被浏览器错误渲染
  formatted = formatted.replace(/(<\/?[a-z][\s\S]*?>)/gi, (match) => {
    // 允许我们在上面刚刚生成的 pre 标签通过
    if (match.startsWith('<pre') || match.startsWith('</pre')) return match;
    return ''; // 直接抹除纯 HTML 结构
  });

  return formatted.replace(/\n/g, '<br/>');
}

watch(currentAiDocumentId, () => {
  toolRunHistoryList.value = [];
  toolRunHistoryError.value = '';

  if (showToolRunReview.value) {
    loadToolRunHistory(true);
  }
});

let streamRafId: number;
// 流式写入编辑器：AI 工具调用参数到达时实时渲染（顺滑打字机效果）
watch(() => aiStore.streamingHtml, (html) => {
  if (!html || !ueditorInstance) return;
  cancelAnimationFrame(streamRafId);
  streamRafId = requestAnimationFrame(() => {
    // 使用原始 setContent 直接写入 DOM，绕过 monkey-patch（不触发保存）
    const rawSetContent = (ueditorInstance as any)._originalSetContent;
    if (aiStore.currentToolName === 'replace_editor_content' && rawSetContent) {
      rawSetContent(html);
    } else if (aiStore.currentToolName === 'insert_content' && rawSetContent) {
      rawSetContent(html);
    }
  });
});

// AI Tool Execution：工具调用完成后的最终一次性执行
watch(() => aiStore.pendingActions, (actions) => {
  if (!actions || actions.length === 0 || !ueditorInstance) return;

  for (const action of actions) {
    switch (action.tool) {
      case 'replace_editor_content':
        if (action.args.html) {
          ueditorInstance.setContent(action.args.html);
        }
        break;
      case 'insert_content':
        if (action.args.html) {
          ueditorInstance.execCommand('inserthtml', action.args.html);
        }
        break;
      case 'set_title':
        if (action.args.title) {
          articleTitle.value = action.args.title;
          editorStore.setTitle(action.args.title);
        }
        break;
    }
  }

  // 消费完毕，清空队列
  aiStore.pendingActions = [];
  debouncedSave();
}, { deep: true });

// 手机/电脑预览模式切换
// 手机/电脑预览模式切换
// 手机/电脑预览模式切换
function togglePreviewMode() {
  previewMode.value = previewMode.value === 'desktop' ? 'mobile' : 'desktop';
  // CSS 会自动通过 padding 挤压容器宽度，不再向 iframe 内强行注入样式和拦截属性。
}

// 预览
function handlePreview() {
  if (!ueditorInstance) return;
  const content = ueditorInstance.getContent();
  const isMobile = previewMode.value === 'mobile';
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>预览</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{max-width:${isMobile ? '430px' : '800px'};margin:40px auto;font-family:sans-serif;padding:0 ${isMobile ? '16px' : '20px'};}</style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
  }
}

// 定时更新字数统计
let wordCountTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  wordCountTimer = setInterval(() => {
    if (ueditorInstance) {
      try {
        const text = ueditorInstance.getContentTxt();
        editorStore.setWordCount(text.length);
      } catch(e) { /* 编辑器未就绪 */ }
    }
  }, 2000);
});
onBeforeUnmount(() => {
  if (wordCountTimer) clearInterval(wordCountTimer);
  document.removeEventListener('pointerdown', handleAIModelClickOutside);
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.editor-workbench {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f6f7f8;
  padding: 14px;
  gap: 10px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 1. 左侧卡片列块 (扁平化设计) */
.left-sider-card {
  width: 300px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px; /* 恢复紧密布局间距 */
  
  .sider-block {
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: none;
    background: #ffffff;
    transition: none;
    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
  }

  /* 1.1 用户登录态块 */
  .user-login-card {
    display: flex;
    align-items: center;
    height: 52px;
    padding: 10px 8px;
    gap: 8px;
    background: #FFEFA3;
    
    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: #FFD60A;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: none;
      
      .avatar-text {
        color: #1D1D1F;
        font-weight: 800;
        font-size: 12px;
      }
    }
    
    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      .user-name { font-weight: 700; color: #1D1D1F; font-size: 12px; }
      .user-role { font-size: 11px; color: #6E6E73; }
    }

    .logout-btn {
      margin-left: auto;
      background: transparent;
      border: none;
      color: #6E6E73;
      cursor: pointer;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      padding: 4px;
      border-radius: 4px;
      transition: background 0.15s, color 0.15s;
      svg { width: 16px; height: 16px; }
      &:hover { color: $layout-sider-dark; background: rgba(0,0,0,0.05); }
    }
  }

  /* 1.2 中间标签组与主体内容区块 */
  .tabs-card-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: none; /* 让边框阴影落在内层 */
    border-radius: 0; /* 标签组容器不加额外圆角 */
    background: transparent;

    &:hover {
      box-shadow: none;
    }

    .tool-tabs {
      display: flex;
      align-items: flex-end;
      
      .tab-item {
        flex: 1;
        height: 40.4px;
        text-align: center;
        font-size: 0.85rem;
        font-weight: 800;
        color: $layout-sider-dark;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        position: relative;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        transition: all 0.2s;
        opacity: 1;
        
        &.active {
          height: 46.4px;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.03);
        }

      }
    }

    .tab-content {
      flex: 1;
      padding: 24px 16px;
      border-radius: 0; /* 下边不使用圆角 */
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      overflow-y: auto;
      transition: background-color 0.3s ease;
      position: relative;
      
      .placeholder-text {
        font-size: 0.95rem;
        color: rgba(0,0,0,0.6);
        line-height: 1.8;
        font-weight: 600;
      }

      /* AI 预设提示词面板 */
      .ai-prompts-panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;

        .ai-prompts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .ai-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: rgba(0,0,0,0.7);
          }

          .ai-clear-btn {
            font-size: 0.75rem;
            color: rgba(0,0,0,0.4);
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 4px;
            &:hover { background: rgba(0,0,0,0.06); }
          }
        }

          .ai-templates-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;

          .ai-tpl-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.06);
            background: rgba(255,255,255,0.7);
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 600;
            color: rgba(0,0,0,0.7);
            transition: all 0.15s;

            &:hover:not(:disabled) {
              background: rgba(255,255,255,0.95);
              border-color: rgba(0,0,0,0.12);
              transform: translateY(-1px);
              box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .tpl-icon { font-size: 1rem; }
            .tpl-label { white-space: nowrap; }
          }
        }

        /* 附件预览条 */
        .ai-file-preview {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(59,130,246,0.08);
          border-radius: 6px;
          font-size: 0.72rem;
          color: #2563eb;
          .file-icon { font-size: 0.9rem; }
          .file-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .file-remove {
            background: none; border: none; cursor: pointer;
            font-size: 0.75rem; color: #94a3b8; padding: 0 2px;
            &:hover { color: #ef4444; }
          }
        }

        .ai-chat-input {
          display: flex;
          gap: 6px;

          .ai-attach-btn {
            padding: 6px 8px;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.7);
            cursor: pointer;
            font-size: 0.9rem;
            &:hover { background: rgba(59,130,246,0.1); }
            &:disabled { opacity: 0.4; cursor: not-allowed; }
          }

          .ai-tpl-input {
            flex: 1;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.7);
            font-size: 0.8rem;
            outline: none;
            &:focus { border-color: rgba(0,0,0,0.15); background: #fff; }
            &::placeholder { color: rgba(0,0,0,0.3); }
          }

          .ai-send-btn {
            padding: 8px 14px;
            border-radius: 8px;
            border: none;
            background: rgba(0,0,0,0.8);
            color: #fff;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.15s;
            &:hover:not(:disabled) { background: rgba(0,0,0,0.9); }
            &:disabled { opacity: 0.4; cursor: not-allowed; }
          }
        }

        /* 流式状态指示器 */
        .ai-stream-status {
          padding: 6px 10px;
          .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: rgba(0,0,0,0.6);
            &.thinking { color: #7c3aed; }
            &.tool { color: #0891b2; }
            &.generating { color: #059669; }
          }
          .status-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: currentColor;
            &.pulse {
              animation: pulse-dot 1.2s ease-in-out infinite;
            }
            &.tool-dot {
              background: #0891b2;
              animation: spin-dot 1s linear infinite;
            }
          }
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes spin-dot {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.3); }
          100% { transform: rotate(360deg) scale(1); }
        }

        /* 思维过程可折叠面板 */
        .ai-thinking-block {
          margin: 6px 10px;
          border: 1px solid rgba(124,58,237,0.15);
          border-radius: 8px;
          background: rgba(124,58,237,0.04);
          overflow: hidden;

          .thinking-summary {
            padding: 6px 10px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #7c3aed;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            user-select: none;
            &::-webkit-details-marker { display: none; }
            &::before {
              content: '▶';
              font-size: 0.6rem;
              transition: transform 0.2s;
            }
          }
          &[open] .thinking-summary::before {
            transform: rotate(90deg);
          }
          .thinking-badge {
            font-size: 0.65rem;
            font-weight: 400;
            background: rgba(124,58,237,0.12);
            padding: 1px 6px;
            border-radius: 10px;
            color: #7c3aed;
          }
          .thinking-content {
            padding: 6px 10px 10px;
            font-size: 0.7rem;
            line-height: 1.5;
            color: rgba(0,0,0,0.55);
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 200px;
            overflow-y: auto;
          }
        }

        .ai-latest-reply {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          background: rgba(255,255,255,0.6);
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.05);

          .reply-content {
            font-size: 0.8rem;
            line-height: 1.6;
            color: rgba(0,0,0,0.7);
            word-break: break-word;
          }
        }
      }
    }
  }

  /* 1.3 底部文章信息：标题+作者+封面 (扁平化) */
  .article-info-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-radius: 0 0 12px 12px;
    background: #FFEFA3;
    border: none;
    
    .info-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .field-label {
        font-size: 11px;
        font-weight: 700;
        color: rgba(0,0,0,0.5);
      }
      
      .field-input {
        width: 100%;
        height: 32px;
        padding: 0 10px;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 8px;
        background: rgba(255,255,255,0.6);
        font-size: 13px;
        font-weight: 600;
        color: #1D1D1F;
        outline: none;
        box-sizing: border-box;
        transition: all $transition-fast;
        
        &::placeholder { color: rgba(0,0,0,0.25); }
        &:focus { 
          border-color: rgba(0,0,0,0.2);
          background: #fff;
        }
      }
    }
    
    .cover-upload-btn {
      background: rgba(255,255,255,0.5);
      border: 1px dashed rgba(0,0,0,0.15);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      transition: all $transition-fast;
      
      .el-icon {
        font-size: 20px;
        color: rgba(0,0,0,0.4);
        margin-top: 2px;
      }
      
      .btn-text {
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 4px;
        strong { font-size: 0.85rem; color: $layout-sider-dark; }
        span { font-size: 0.7rem; color: rgba(0,0,0,0.5); line-height: 1.4; }
      }
      
      &:hover { 
        border-color: rgba(0,0,0,0.4);
        background: rgba(255,255,255,0.8);
      }
    }
  }
}

/* 2. 中间卡片 */
.center-editor-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px 12px 0 0;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  overflow: hidden;
  position: relative;
}

/* 工具栏独立容器 (UEditor 扁平化深度重塑) */
.editor-toolbar-area {
  flex-shrink: 0;

  /* UEditor外壳框与背景彻底拍平 */
  :deep(.edui-default .edui-editor-toolbarbox) {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
  }
  :deep(.edui-default .edui-editor-toolbarboxinner) {
    background: transparent !important;
    background-image: none !important;
    border: none !important;
    box-shadow: none !important;
    padding: 8px 14px !important; /* 给左右一些留白呼吸 */
  }
  :deep(.edui-default .edui-toolbar) {
    background: transparent !important;
    border: none !important;
  }

  /* 单个工具栏小按钮扁平状态（常规方形独立按钮） */
  :deep(.edui-default .edui-button-wrap) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 6px !important;
    padding: 2px !important;
    height: 28px !important;
    min-width: 28px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background 0.15s !important;
    box-sizing: border-box !important;
  }

  /* 复合下拉按钮状态（需要容纳内部文本或倒三角，不可强行锁死居中与死宽度） */
  :deep(.edui-default .edui-splitbutton-body),
  :deep(.edui-default .edui-menubutton-body),
  :deep(.edui-default .edui-combox-body) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 6px !important;
    padding: 2px 4px !important;
    height: 28px !important;
    display: inline-flex !important;
    align-items: center !important;
    transition: background 0.15s !important;
    box-sizing: border-box !important;
  }
  
  /* 确保嵌套在内部的 body 结构不仅居中且为相对定位（防止内部绝对定位的如 colorlump 塌陷） */
  :deep(.edui-default .edui-button-body) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
  }

  /* 工具栏按钮Hover状态同步标准 */
  :deep(.edui-default .edui-button-wrap:hover),
  :deep(.edui-default .edui-splitbutton-body:hover),
  :deep(.edui-default .edui-menubutton-body:hover),
  :deep(.edui-default .edui-combox-body:hover) {
    background: rgba(0,0,0,0.06) !important; /* 匹配白底环境的最佳扁平高亮色 */
    color: rgba(0,0,0,0.9) !important;
    box-shadow: none !important;
  }

  /* 工具栏按钮Active(按下)状态同步 action-icon-btn 标准 */
  :deep(.edui-default .edui-button-wrap:active),
  :deep(.edui-default .edui-splitbutton-body:active),
  :deep(.edui-default .edui-menubutton-body:active),
  :deep(.edui-default .edui-combox-body:active) {
    transform: scale(0.96) !important;
  }
  
  /* UEditor 图标背景强行清空，全部让出给后来注入的 SVG，无论是在工具栏还是下拉菜单弹窗中 */
  :deep(.edui-default .edui-icon),
  :deep(.edui-default .edui-arrow) {
    background-image: none !important;
  }
  
  /* 去除下拉与颜色选择按钮内部恶心的丑陋细分割线 */
  :deep(.edui-default .edui-splitborder) {
    display: none !important; 
  }
  
  /* 将UEditor老旧的分隔柱转换成现代极简风格的细灰线 */
  :deep(.edui-default .edui-separator) {
    width: 1px !important;
    height: 16px !important;
    background: rgba(0,0,0,0.08) !important;
    margin: 6px 8px !important;
    border: none !important;
    box-shadow: none !important;
  }
}

/* 全文悬浮下拉菜单 (.edui-popup 等通常挂载在 body 上，所以放在非 .editor-toolbar 内部) */
body .edui-default .edui-icon,
body .edui-default .edui-arrow {
  background-image: none !important;
}

/* 编辑内容区 */
.editor-content-area {
  flex: 1;
  overflow: auto;
  position: relative; /* 悬浮状态信息定位参考 */
  background: #f5f5f7; /* 全局统一灰底 */

  /* 编辑器原生外壳边界全去 */
  :deep(.edui-default .edui-editor) {
    border: none !important;
    box-shadow: none !important;
    background-color: transparent !important;
    border-radius: 0 !important;
  }
}

/* 悬浮状态信息 */
.editor-status-float {
  position: absolute;
  bottom: 8px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: rgba(0,0,0,0.35);
  pointer-events: none;
  z-index: 5;
  
  .status-item,
  .status-text {
    font-weight: 600;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    color: #10b981;
    background: currentColor;
    font-weight: 600;
  }
  .divider {
    display: none;
  }
  .project-id {
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: rgba(0,0,0,0.45);
    letter-spacing: 0.3px;
  }
}

/* 编辑器画布（默认电脑模式：内容比例同手机(375px) 但放大显示） */
.center-editor-card:not(.mobile-preview) .editor-content-area :deep(#ueditor-container) {
  width: 375px; 
  margin: 0 auto;
  background: #ffffff;
  box-shadow: 0 0 16px rgba(0,0,0,0.04);
  min-height: 100%;
  zoom: 1.6; /* 放大比例，排版保持 375px 完全不变 */
  transition: zoom 0.3s;
}

/* 手机预览模式（真实 1:1 比例） */
.center-editor-card.mobile-preview .editor-content-area :deep(#ueditor-container) {
  width: 375px;
  margin: 0 auto;
  background: #ffffff;
  box-shadow: 0 0 16px rgba(0,0,0,0.04);
  min-height: 100%;
  zoom: 1; 
  transition: zoom 0.3s;
}

/* 设备切换按钮高亮 */
.device-toggle.active {
  background: rgba(0,0,0,0.1) !important;
  color: $layout-sider-dark !important;
}

/* 3. 右侧面板 */
.right-panel {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  min-height: 0;
}

/* 3.0 独立操作栏 (扁平化无边框，收紧宽度) */
.action-bar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 52px;
  background: #FFEFA3;
  border-radius: 12px 12px 0 0;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);

  .action-bar-left, .action-bar-right {
    display: flex;
    align-items: center;
    gap: 4px; /* 恢复紧凑距 */
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 2px; /* 组内最小距 */
  }

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
    
    &:hover {
      background: rgba(255,255,255,0.5);
      color: rgba(0,0,0,0.9);
    }
    
    &:active {
      background: rgba(0,0,0,0.05);
    }
    
    &.active {
      background: rgba(255,255,255,0.5);
      color: $layout-sider-dark;
    }
  }

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
    background: $layout-sider-dark;
    color: #ffffff;
    border-radius: 999px;
    padding: 0 16px;
    &:hover { 
      opacity: 0.9;
      transform: translateY(-1px);
    }
  }

  .action-bar-divider {
    width: 1px;
    height: 16px;
    background: rgba(0,0,0,0.1);
    margin: 0 4px;
  }
}

/* 历史对话悬浮窗 */
.chat-history-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.18);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 80px 24px 0 0;
}
.chat-history-popup {
  background: #ffffff;
  border-radius: 12px;
  width: 320px;
  max-height: 420px;
  border: none;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chat-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.chat-history-close {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover { background: rgba(0,0,0,0.06); color: #333; }
}
.chat-history-body {
  overflow-y: auto;
  flex: 1;
}
.chat-history-empty {
  padding: 40px 20px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
}
.chat-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  transition: background 0.15s;
  &:last-child { border-bottom: none; }
  &:hover { background: #f7f8f9; }
}
.chat-history-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.chat-history-label {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-history-time {
  font-size: 11px;
  color: #b0b0b0;
}
.chat-history-del {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-left: 8px;
  &:hover { color: #e74c3c; background: rgba(231,76,60,0.08); }
}

.tool-run-popup {
  background: #ffffff;
  border-radius: 16px;
  width: min(620px, calc(100vw - 48px));
  max-height: calc(100vh - 120px);
  border: none;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tool-run-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: #fffdf4;
}

.tool-run-toolbar-meta {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0,0,0,0.52);
}

.tool-run-refresh {
  border: none;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.tool-run-body {
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-run-empty {
  padding: 44px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.tool-run-error {
  color: #dc2626;
}

.tool-run-item {
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;

  &[open] .tool-run-summary {
    background: #fffdf4;
  }
}

.tool-run-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }
}

.tool-run-summary-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tool-run-name {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}

.tool-run-model {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 11px;
  font-weight: 600;
}

.tool-run-time {
  flex-shrink: 0;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 600;
}

.tool-run-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px 14px;
}

.tool-run-reply,
.tool-run-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-run-block-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0,0,0,0.45);
  letter-spacing: 0.02em;
}

.tool-run-reply p,
.tool-run-block pre {
  margin: 0;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(0,0,0,0.05);
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

/* 3.1 AI 卡片 */
.right-ai-card {
  background: #FFEFA3;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex: 1;
  min-height: 0;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);

  .ai-panel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .ai-panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }

  .ai-panel-doc {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.65);
    color: rgba(0,0,0,0.52);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .ai-panel-link {
    border: none;
    background: rgba(255,255,255,0.72);
    color: #111827;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;

    &:hover:not(:disabled) {
      background: #ffffff;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }


  .ai-welcome {
    background: #ffffff;
    padding: 16px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    color: $layout-sider-dark;
    line-height: 1.6;
    margin-bottom: auto;
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  }

  .ai-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 4px 8px 0; /* padding-right 4px 留出滚动条空间 */
    display: flex;
    flex-direction: column;
    gap: 8px;

    /* 定制隐藏式滚动条 */
    &::-webkit-scrollbar {
      width: 6px;
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 4px;
    }
    &:hover::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.15); /* 鼠标移入内容区时显示 */
    }
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(0,0,0,0.3); /* 鼠标放在滚动条上时加深 */
    }

    .ai-msg {
      display: flex;
      flex-direction: column;

      &.user {
        align-items: flex-end;
        .ai-msg-bubble {
          background: #FFF3C4;
          color: #1a1a1a;
          border-radius: 14px 14px 4px 14px;
        }
      }
      &.assistant {
        align-items: flex-start;
        .ai-msg-bubble {
          background: #fff;
          color: #333;
          border-radius: 14px 14px 14px 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
      }
    }

    .ai-msg-bubble {
      max-width: 90%;
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.6;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .ai-typing {
      color: #999;
      font-style: italic;
    }

    .ai-msg-code {
      max-width: 90%;
      margin-top: 4px;
      pre {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.5;
        overflow-x: auto;
        margin: 0;
        code { font-family: 'SF Mono', Menlo, Consolas, monospace; }
      }
    }


    /* 极简思维链与状态指示 */
    .ai-thinking-minimal {
      margin: 8px 0;
      &[open] .chevron-arrow svg {
        transform: rotate(90deg);
      }
      .thinking-summary-minimal {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        user-select: none;
        list-style: none;
        &::-webkit-details-marker {
          display: none; /* Safari */
        }
        .chevron-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          svg {
            transition: transform 0.2s;
            color: #6b7280;
          }
        }
      }
      .thinking-content-minimal {
        margin-top: 8px;
        padding-left: 20px;
        padding-bottom: 8px;
        font-size: 13px;
        line-height: 1.6;
        color: #4b5563;
        white-space: pre-wrap;
        word-break: break-word;
        border-left: 2px solid #e5e7eb;
        margin-left: 6px;
        max-height: 250px;
        overflow-y: auto;
      }
    }

    .ai-status-minimal {
      margin-top: 10px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      animation: pulse-text 1.5s infinite ease-in-out;
    }

    .ai-status-tool {
      color: #0891b2;
      font-size: 13px;
      background: rgba(8,145,178,0.06);
      padding: 6px 10px;
      border-radius: 8px;
      display: inline-block;
    }

    @keyframes pulse-text {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }
  }

  /* 附件预览条 */
  .ai-file-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: rgba(59,130,246,0.08);
    border: none;
    border-radius: 8px;
    font-size: 0.72rem;
    color: #2563eb;
    margin-top: 8px;
    button {
      background: none; border: none; cursor: pointer;
      font-size: 0.75rem; color: #94a3b8;
      &:hover { color: #ef4444; }
    }
  }

  .ai-input {
    display: block;
    width: 100%;
    background: #ffffff;
    border-radius: 999px;
    padding: 8px;
    border: none;
    margin-top: 10px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);

    .ai-input-row {
      display: flex;
      width: 100%;
      box-sizing: border-box;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 0 4px 0 4px;
    }

    .attach-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      opacity: 0.5;
      &:hover { opacity: 1; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }

    .chat-input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.9rem;
      font-weight: 500;
      color: $layout-sider-dark;
      &::placeholder { color: rgba(0,0,0,0.3); }
    }
    
    .stop-btn-round {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: #ef4444;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      &:hover { background: #dc2626; transform: scale(1.05); }
    }

    .send-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FFD60A;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $layout-sider-dark;
      cursor: pointer;
      transition: transform 0.2s;
      flex-shrink: 0;
      &:hover { transform: scale(1.05); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }

  .ai-input-meta {
    position: relative;
    display: flex;
    justify-content: flex-start;
    margin-top: 8px;
    padding: 0 4px;
  }

  .ai-model-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.72);
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #1a1a1a;
    outline: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

    svg {
      flex-shrink: 0;
      transition: transform 0.18s ease;
    }

    &.open svg {
      transform: rotate(180deg);
    }

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(0, 0, 0, 0.12);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  .ai-model-trigger-text {
    display: block;
    min-width: 0;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-model-menu {
    position: absolute;
    left: 8px;
    top: calc(100% + 8px);
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: min(220px, calc(100% - 16px));
    padding: 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(10px);
    z-index: 3;
  }

  .ai-model-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: rgba(249, 250, 251, 0.92);
    text-align: left;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

    &:hover {
      background: #ffffff;
      border-color: rgba(0, 0, 0, 0.08);
      transform: translateY(-1px);
    }

    &.active {
      background: #fff7cc;
      border-color: rgba(255, 214, 10, 0.45);
    }
  }

  .ai-model-option-provider {
    font-size: 10px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.42);
    letter-spacing: 0.02em;
  }

  .ai-model-option-name {
    font-size: 12px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.4;
  }
}

.image-float-toolbar {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 6px;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  pointer-events: auto;
  transform-origin: center bottom;
  animation: scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.image-float-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
  position: relative;
  
  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 14px;
    background: #e5e7eb;
  }
}
</style>

<style>
/* 强制全局隐藏 UEditor 原生的图片排版悬浮窗，防止与自定义悬浮窗冲突 */
.edui-popup:has(span[onclick*="_onImgSetFloat"]) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
