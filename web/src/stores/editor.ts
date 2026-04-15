import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Article, Project } from '@/types';
import http from '@/utils/http';

export const useEditorStore = defineStore('editor', () => {
  // 当前项目
  const currentProject = ref<Project | null>(null);
  
  // 文章内容
  const article = ref<Partial<Article>>({
    title: '',
    content: '',
    summary: '',
    coverImage: '',
    tags: [],
    word_count: 0,
  });

  // 自动保存状态
  const isSaving = ref<boolean>(false);
  const autoSaving = ref<boolean>(false); // 专门用于打字期间的防抖状态指示
  const lastSavedAt = ref<Date | null>(null);
  const hasUnsavedChanges = ref<boolean>(false);

  // 项目列表（从 API 加载）
  const projects = ref<Project[]>([]);

  const recentProjects = computed(() => {
    return [...projects.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  // 加载项目列表
  const fetchProjects = async () => {
    try {
      const res: any = await http.get('/collab/documents', { params: { limit: 50 } });
      if (res.success) {
        projects.value = res.data.list.map((d: any) => ({
          id: d.id,
          title: d.title || '无标题文档',
          status: d.status || 'draft',
          updatedAt: new Date(d.updated_at || d.updatedAt),
          createdAt: new Date(d.created_at || d.createdAt),
        }));
      }
    } catch (err) {
      console.error('获取项目列表失败:', err);
    }
  };

  const setProject = (project: Project) => {
    currentProject.value = project;
  };

  const setWordCount = (count: number) => {
    article.value.word_count = count;
  };

  // 保存到后端
  const save = async () => {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      if (currentProject.value?.id) {
        // 更新已有文档
        await http.put(`/collab/documents/${currentProject.value.id}`, {
          title: article.value.title,
          content: article.value.content,
          summary: article.value.summary,
          cover_image: article.value.coverImage,
        });
      } else {
        // 新建文档
        const res: any = await http.post('/collab/documents', {
          title: article.value.title || '无标题文档',
          content: article.value.content,
          summary: article.value.summary,
        });
        if (res.success && res.data) {
          currentProject.value = {
            id: res.data.id,
            title: article.value.title || '无标题文档',
            status: 'draft',
            updatedAt: new Date(),
            createdAt: new Date(),
          };
        }
      }
      lastSavedAt.value = new Date();
      hasUnsavedChanges.value = false;
    } catch (err) {
      console.error('保存失败:', err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  };

  const createProject = async (title: string) => {
    try {
      const res: any = await http.post('/collab/documents', {
        title: title || '无标题文档',
        content: '',
      });
      if (res.success && res.data) {
        const newProject: Project = {
          id: res.data.id,
          title,
          status: 'draft',
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        projects.value.unshift(newProject);
        currentProject.value = newProject;
        article.value = {
          title: '',
          content: '',
          summary: '',
          coverImage: '',
          tags: [],
        };
        return newProject;
      }
    } catch (err) {
      console.error('创建项目失败:', err);
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await http.delete(`/collab/documents/${id}`);
      const index = projects.value.findIndex(p => p.id === id);
      if (index > -1) {
        projects.value.splice(index, 1);
      }
      if (currentProject.value?.id === id) {
        currentProject.value = null;
      }
    } catch (err) {
      console.error('删除项目失败:', err);
      throw err;
    }
  };

  // ===== 自动保存逻辑 =====
  let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // 防抖保存：内容变更后 2 秒自动触发
  const _debounceSave = () => {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    autoSaving.value = true;
    _debounceTimer = setTimeout(async () => {
      autoSaving.value = false;
      if (hasUnsavedChanges.value && currentProject.value?.id) {
        try { await save(); } catch (e) { console.error('自动保存失败:', e); }
      }
    }, 2000);
  };

  // 心跳保存：每 30 秒检查并保存
  const _heartbeatSave = async () => {
    if (hasUnsavedChanges.value && currentProject.value?.id && !isSaving.value) {
      try { await save(); } catch (e) { console.error('心跳保存失败:', e); }
    }
  };

  // 页面离开前保存
  const _beforeUnloadHandler = () => {
    if (hasUnsavedChanges.value && currentProject.value?.id) {
      // 使用 sendBeacon 进行最后一次同步保存
      const payload = JSON.stringify({
        title: article.value.title,
        content: article.value.content,
        summary: article.value.summary,
      });
      const token = localStorage.getItem('token');
      const headers = { type: 'application/json' };
      const blob = new Blob([payload], headers);
      navigator.sendBeacon(
        `/api/collab/documents/${currentProject.value.id}?_method=PUT&token=${token}`,
        blob
      );
    }
  };

  // 启动自动保存（在 EditorView onMounted 中调用）
  const setupAutoSave = () => {
    // 启动心跳定时器
    _heartbeatTimer = setInterval(_heartbeatSave, 30000);
    // 监听页面离开
    window.addEventListener('beforeunload', _beforeUnloadHandler);
  };

  // 销毁自动保存（在 EditorView onUnmounted 中调用）
  const teardownAutoSave = () => {
    if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    window.removeEventListener('beforeunload', _beforeUnloadHandler);
    autoSaving.value = false;
  };

  // 覆盖原 updateArticle/setTitle/setContent，自动触发防抖保存
  const updateArticleWithAutoSave = (data: Partial<Article>) => {
    article.value = { ...article.value, ...data };
    hasUnsavedChanges.value = true;
    _debounceSave();
  };

  const setTitleWithAutoSave = (title: string) => {
    article.value.title = title;
    hasUnsavedChanges.value = true;
    _debounceSave();
  };

  const setContentWithAutoSave = (content: string) => {
    article.value.content = content;
    hasUnsavedChanges.value = true;
    _debounceSave();
  };

  return {
    currentProject,
    article,
    projects,
    recentProjects,
    isSaving,
    autoSaving,
    lastSavedAt,
    hasUnsavedChanges,
    fetchProjects,
    setProject,
    updateArticle: updateArticleWithAutoSave,
    setTitle: setTitleWithAutoSave,
    setContent: setContentWithAutoSave,
    setWordCount,
    save,
    createProject,
    deleteProject,
    setupAutoSave,
    teardownAutoSave,
  };
}, {
  persist: {
    key: 'editor-store',
    paths: ['currentProject', 'article'],
  },
});
