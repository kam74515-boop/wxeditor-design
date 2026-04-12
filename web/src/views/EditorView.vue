<template>
  <div class="editor-workbench">
    <!-- 1. 左侧栏：用户信息与面板区（拆分为三个独立卡区） -->
    <aside class="left-sider-card">
      
      <!-- 1.1 独立的用户卡片 block -->
      <div class="sider-block user-login-card">
        <div class="user-avatar">
          <span class="avatar-text">K</span>
        </div>
        <div class="user-info">
          <span class="user-name">Karl</span>
          <span class="user-role">已登录 · 微信公众号编辑</span>
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
        <div class="action-bar-left">
          <button class="action-icon-btn" title="撤销" @click="execUndoRedo('undo')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="action-icon-btn" title="重做" @click="execUndoRedo('redo')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
        <div class="action-bar-right">
          <button class="action-icon-btn" title="预览" @click="handlePreview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <!-- 手机/电脑预览切换 -->
          <button class="action-icon-btn device-toggle" :class="{ active: previewMode === 'mobile' }" :title="previewMode === 'mobile' ? '切换为电脑视图' : '切换为手机视图'" @click="togglePreviewMode">
            <svg v-if="previewMode === 'desktop'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </button>
          <button class="action-icon-btn" title="历史对话" @click="showChatHistory = !showChatHistory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button class="action-icon-btn" title="新建对话" @click="handleNewChat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="action-btn primary-btn" @click="() => {}"><el-icon><Position /></el-icon> 导出 / 发布</button>
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

      <!-- 3.1 AI 助手区（完整交互面板） -->
      <div class="right-ai-card">

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
          <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx,.html,.htm,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg" style="display:none" @change="handleFileSelect" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch, reactive, ref } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useEditorStore, useAIStore } from '@/stores';
import { initUEditor, destroyUEditor } from '@/utils';
import { injectCustomColorPicker } from '@/utils/color-picker';
import { Picture, Position, Promotion, Loading, Crop, FullScreen, Close } from '@element-plus/icons-vue';
import { promptTemplates as aiPromptTemplates } from '@/stores/ai';
import type { PromptTemplate } from '@/stores/ai';
import type { ChatMessage } from '@/types';
import http from '@/utils/http';
import { ElMessage, ElMessageBox } from 'element-plus';
import 'vue-cropper/dist/index.css';
import { VueCropper } from 'vue-cropper';
import BackButton from '@/components/navigation/BackButton.vue';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore();
const aiStore = useAIStore();

onBeforeRouteLeave(async (to, _from, next) => {
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
const aiInput = ref('');
let ueditorInstance: UEditorInstance | null = null;

// ---- 聊天历史管理 ----
interface ChatHistoryItem {
  title: string;
  time: string;
  messages: ChatMessage[];
}
const showChatHistory = ref(false);
const chatHistoryList = ref<ChatHistoryItem[]>([]);

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
      ueditorInstance.ready(() => {
        ueditorInstance!.execCommand('serverparam', {
          projectId: currentProject.value?.id || '',
        });

        // 注入自定义对齐循环按钮到工具栏
        injectAlignmentButton(ueditorInstance!);
        
        // 注入自定义颜色选择器（替代 UEditor 原生 ColorPicker）
        injectCustomColorPicker(ueditorInstance!);
        
        // 将工具栏移到独立容器中，与编辑内容区分离
        const toolbarBox = document.querySelector('#ueditor-container .edui-editor-toolbarbox');
        if (toolbarBox && toolbarAreaRef.value) {
          toolbarAreaRef.value.appendChild(toolbarBox);
        }
        
        // 设置内容变化回调
        const originalSetContent = ueditorInstance!.setContent.bind(ueditorInstance);
        // 保存原始 setContent 引用供流式渲染使用（不触发保存）
        (ueditorInstance as any)._originalSetContent = originalSetContent;
        ueditorInstance!.setContent = (content: string, isAppend?: boolean) => {
          editorStore.setContent(content);
          // 触发防抖保存
          debouncedSave();
          return originalSetContent(content, isAppend);
        };

        // 监听图片点击和选取以显示悬浮工具栏
        // 兜底原生事件：强制 UEditor 选中被点击的图片，防止复杂嵌套下选中判定丢失
        if (ueditorInstance.document) {
          ueditorInstance.document.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'IMG') {
              const range = ueditorInstance!.selection.getRange();
              range.selectNode(target).select();
            }
          });
        }
        ueditorInstance.addListener('selectionchange', () => {
          const range = ueditorInstance!.selection.getRange();
          const closedNode = range.getClosedNode();
          const startNode = ueditorInstance!.selection.getStart();
          
          let imgNode = null;
          if (closedNode && closedNode.tagName === 'IMG') {
            imgNode = closedNode;
          } else if (startNode && startNode.tagName === 'IMG') {
            imgNode = startNode;
          }
          
          if (imgNode) {
            const iframe = ueditorInstance!.iframe;
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
        if (ueditorInstance.window) {
          ueditorInstance.window.addEventListener('scroll', () => {
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

// AI 自定义输入发送（支持附件）
function handleAISend() {
  const text = aiInput.value.trim();
  const file = aiStore.attachedFile;
  if ((!text && !file) || aiStore.isLoading) return;

  aiInput.value = '';
  const editorContent = ueditorInstance?.getContent?.() || '';
  const prompt = text || `请分析并处理这个文件的内容，将其排版后写入编辑器`;
  const docId = currentProject.value?.id || editorStore.currentProject?.id;
  aiStore.sendMessage(prompt, editorContent, file || undefined, docId);
  aiStore.attachedFile = null;
}

// 最新 AI 回复
const latestAIReply = computed(() => {
  const msgs = aiStore.messages.filter(m => m.role === 'assistant');
  return msgs.length > 0 ? msgs[msgs.length - 1].content : '';
});

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

function handleSave() {
  if (!ueditorInstance) return;
  const content = ueditorInstance.getContent();
  editorStore.setContent(content);
  // TODO: 调用后端接口保存
  console.log('保存内容:', content.substring(0, 100) + '...');
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

/* 1. 左侧卡片列块 */
.left-sider-card {
  width: 300px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px; /* 卡片之间的间隙，参照原文件的 8px gap */
  
  .sider-block {
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  /* 1.1 用户登录态块 */
  .user-login-card {
    background: $brand-yellow;
    display: flex;
    align-items: center;
    height: 52px;
    padding: 10px 8px;
    gap: 8px;
    
    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: #FFD60A;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
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
      svg { width: 16px; height: 16px; }
      &:hover { color: $layout-sider-dark; }
    }
  }

  /* 1.2 中间标签组与主体内容区块 (原稿无特别底色，依靠内容撑开) */
  .tabs-card-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: none; /* 让边框阴影落在内层 */
    border-radius: 0; /* 标签组容器不加额外圆角 */

    .tool-tabs {
      display: flex;
      align-items: flex-end;
      
      .tab-item {
        flex: 1;
        text-align: center;
        font-size: 0.85rem;
        font-weight: 800;
        color: $layout-sider-dark;
        padding: 12px 0 8px 0;
        cursor: pointer;
        position: relative;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        transition: all 0.2s;
        opacity: 0.7;
        
        &.active {
          opacity: 1;
          padding-bottom: 14px;
          z-index: 2;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.03);
        }
        &:hover:not(.active) { opacity: 0.9; }
      }
    }

    .tab-content {
      flex: 1;
      padding: 24px 16px;
      border-radius: 0; /* 下边不使用圆角 */
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      overflow-y: auto;
      transition: background-color 0.3s ease;
      
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

  /* 1.3 底部文章信息：标题+作者+封面 */
  .article-info-card {
    background: $brand-yellow;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
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
        &::placeholder { color: rgba(0,0,0,0.25); }
        &:focus { border-color: rgba(0,0,0,0.2); background: #fff; }
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
      
      &:hover { border-color: rgba(0,0,0,0.4); background: rgba(255,255,255,0.8); }
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  overflow: hidden;
  position: relative;
}
/* 工具栏独立容器 */
.editor-toolbar-area {
  flex-shrink: 0;
}
/* 编辑内容区 */
.editor-content-area {
  flex: 1;
  overflow: auto;
  position: relative; /* 悬浮状态信息定位参考 */
  background: #f5f5f7; /* 全局统一灰底 */
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
  
  .status-item { font-weight: 600; }
  .status-dot { color: #10b981; font-weight: 600; }
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

/* 3.0 独立操作栏 - 和左侧 sider-block 同风格 */
.action-bar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 52px;
  background: $brand-yellow;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);

  .action-bar-left {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .action-bar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .action-icon-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0,0,0,0.5);
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
      background: rgba(255,255,255,0.5);
      color: rgba(0,0,0,0.8);
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
  .text-btn {
    background: transparent;
    color: rgba(0,0,0,0.6);
    &:hover { background: rgba(255,255,255,0.5); color: rgba(0,0,0,0.8); }
  }
  .secondary-btn {
    background: rgba(255,255,255,0.6);
    color: $layout-sider-dark;
    &:hover { background: rgba(255,255,255,0.85); }
  }
  .primary-btn {
    background: $layout-sider-dark;
    color: #ffffff;
    border-radius: 999px;
    padding: 0 16px;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
  }

  .action-bar-divider {
    width: 1px;
    height: 20px;
    background: rgba(0,0,0,0.1);
    margin: 0 2px;
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

/* 3.1 AI 卡片 */
.right-ai-card {
  background: $brand-yellow;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex: 1;
  min-height: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);


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
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 999px;
    padding: 6px 6px 6px 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    margin-top: 10px;
    
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
      &:hover { transform: scale(1.05); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }
}

.image-float-toolbar {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 6px;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  pointer-events: auto;
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
  border-radius: 6px;
  transition: all 0.2s;
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