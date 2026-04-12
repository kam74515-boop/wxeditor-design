<template>
  <!-- 管理后台 — AI 接口配置 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">AI 接口配置</h1>
      <button class="btn-add" @click="showAddDialog = true">
        <Plus class="icon" :size="14" />
        添加供应商
      </button>
    </div>
    <p class="admin-main__desc">管理 AI 服务的 API 密钥和模型参数，支持动态切换供应商。</p>

    <!-- API 供应商列表 -->
    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">API 供应商</h3>
    <div class="ai-config-list">
      <div
        v-for="config in configs"
        :key="config.id"
        :class="['ai-config-card', { 'ai-config-card--active': config.is_active }]"
      >
        <div class="ai-config-card__left">
          <div :class="['ai-config-card__logo', `ai-config-card__logo--${config.color}`]">
            <component :is="config.icon" class="icon" :size="20" />
          </div>
          <div class="ai-config-card__info">
            <span class="ai-config-card__name">{{ config.name }}</span>
            <span :class="['ai-config-card__model', { 'ai-config-card__model--connected': config.is_active }]">
              {{ config.model }} · {{ config.is_active ? '已连接' : '备用' }}
            </span>
          </div>
        </div>
        <div class="ai-config-card__right">
          <span :class="['ai-config-card__status', `ai-config-card__status--${config.is_active ? 'active' : 'standby'}`]">
            {{ config.is_active ? '● 活跃' : '○ 待机' }}
          </span>
          <button v-if="!config.is_active" class="btn-sm btn-activate" @click="activateConfig(config.id)" title="启用此供应商">启用</button>
          <Settings class="icon" :size="16" style="color: rgba(0,0,0,0.25); cursor: pointer;" @click="editConfig(config)" />
          <button v-if="!config.is_active" class="btn-sm btn-delete" @click="deleteConfig(config.id)" title="删除">×</button>
        </div>
      </div>
    </div>

    <!-- 模型参数 -->
    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">模型参数</h3>
    <div class="param-grid">
      <div class="param-card">
        <span class="param-card__label">Temperature</span>
        <span class="param-card__value">{{ activeConfig?.temperature || 0.7 }}</span>
      </div>
      <div class="param-card">
        <span class="param-card__label">Max Tokens</span>
        <span class="param-card__value">{{ activeConfig?.max_tokens || 4096 }}</span>
      </div>
      <div class="param-card">
        <span class="param-card__label">Top P</span>
        <span class="param-card__value">{{ activeConfig?.top_p || 0.95 }}</span>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showAddDialog" :title="editingId ? '编辑供应商' : '添加供应商'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="供应商名称">
          <el-input v-model="form.name" placeholder="例如: 通义千问" />
        </el-form-item>
        <el-form-item label="Provider">
          <el-select v-model="form.provider" placeholder="选择供应商">
            <el-option label="通义千问 (Qwen)" value="qwen" />
            <el-option label="OpenAI" value="openai" />
            <el-option label="Claude" value="claude" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="form.api_key" type="password" show-password placeholder="sk-..." />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="form.base_url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="例如: qwen3.5-plus" />
        </el-form-item>
        <el-form-item label="Temperature">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" />
        </el-form-item>
        <el-form-item label="Max Tokens">
          <el-input-number v-model="form.max_tokens" :min="256" :max="32768" :step="256" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Settings, Sparkles, Brain } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import axios from 'axios';

interface AIConfig {
  id: number;
  name: string;
  provider: string;
  model: string;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  top_p: number;
  icon: any;
  color: string;
}

const configs = ref<AIConfig[]>([]);
const showAddDialog = ref(false);
const editingId = ref<number | null>(null);
const form = ref({
  name: '',
  provider: 'qwen',
  api_key: '',
  base_url: '',
  model: '',
  temperature: 0.7,
  max_tokens: 4096,
});

const activeConfig = computed(() => configs.value.find((c) => c.is_active));

// 图标和颜色映射
const providerMeta: Record<string, { icon: any; color: string }> = {
  qwen: { icon: Sparkles, color: 'purple' },
  openai: { icon: Brain, color: 'blue' },
  claude: { icon: Sparkles, color: 'pink' },
  custom: { icon: Settings, color: 'green' },
};

async function fetchConfigs() {
  try {
    const { data } = await axios.get('/api/admin/ai-configs');
    configs.value = (data.data || []).map((c: any) => ({
      ...c,
      ...providerMeta[c.provider] || providerMeta.custom,
    }));
  } catch {
    // 开发模式使用模拟数据
    configs.value = [
      { id: 1, name: '通义千问 (Qwen)', provider: 'qwen', model: 'qwen3.5-plus', is_active: true, temperature: 0.7, max_tokens: 4096, top_p: 0.95, icon: Sparkles, color: 'purple' },
      { id: 2, name: 'OpenAI (GPT-4o)', provider: 'openai', model: 'gpt-4o', is_active: false, temperature: 0.7, max_tokens: 4096, top_p: 0.95, icon: Brain, color: 'blue' },
    ];
  }
}

function editConfig(config: AIConfig) {
  editingId.value = config.id;
  form.value = { name: config.name, provider: config.provider, api_key: '', base_url: '', model: config.model, temperature: config.temperature, max_tokens: config.max_tokens };
  showAddDialog.value = true;
}

async function saveConfig() {
  try {
    if (editingId.value) {
      await axios.put(`/api/admin/ai-configs/${editingId.value}`, form.value);
    } else {
      await axios.post('/api/admin/ai-configs', form.value);
    }
    ElMessage.success('保存成功');
    showAddDialog.value = false;
    editingId.value = null;
    fetchConfigs();
  } catch {
    ElMessage.error('保存失败');
  }
}

async function activateConfig(id: number) {
  try {
    await axios.post(`/api/admin/ai-configs/${id}/activate`);
    ElMessage.success('已切换活跃供应商');
    fetchConfigs();
  } catch {
    ElMessage.error('切换失败');
  }
}

async function deleteConfig(id: number) {
  try {
    await axios.delete(`/api/admin/ai-configs/${id}`);
    ElMessage.success('已删除');
    fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.error || '删除失败');
  }
}

onMounted(fetchConfigs);
</script>
