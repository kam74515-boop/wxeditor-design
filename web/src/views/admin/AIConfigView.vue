<template>
  <!-- 管理后台 — AI 接口配置 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">AI 接口配置</h1>
      <button class="btn-add" @click="openCreateDialog">
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
              {{ config.default_model_display_name || config.model }} · 前端可选 {{ config.visible_model_count || 0 }} 个
            </span>
          </div>
        </div>
        <div class="ai-config-card__right">
          <span :class="['ai-config-card__status', `ai-config-card__status--${config.is_active ? 'active' : 'standby'}`]">
            {{ config.is_active ? '● 活跃' : '○ 待机' }}
          </span>
          <el-button size="small" text :loading="testingId === config.id" @click="testConfig(config.id)">测试</el-button>
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
        <span class="param-card__value">模型默认</span>
      </div>
      <div class="param-card">
        <span class="param-card__label">Top P</span>
        <span class="param-card__value">{{ activeConfig?.top_p || 0.95 }}</span>
      </div>
      <div class="param-card">
        <span class="param-card__label">前端可见模型</span>
        <span class="param-card__value">{{ activeConfig?.visible_model_count || 0 }}</span>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showAddDialog" :title="editingId ? '编辑供应商' : '添加供应商'" width="720px">
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
        <el-form-item label="默认模型">
          <el-select
            v-if="form.model_catalog.length"
            v-model="form.model"
            :disabled="catalogSaving"
            @change="handleDefaultModelChange"
            filterable
            placeholder="选择默认模型"
            style="width: 100%;"
          >
            <el-option
              v-for="item in form.model_catalog"
              :key="item.local_key"
              :label="`${item.display_name} (${item.id})`"
              :value="item.id"
            />
          </el-select>
          <el-input v-else v-model="form.model" placeholder="例如: qwen3.5-plus" />
        </el-form-item>
        <el-form-item label="Temperature">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" />
        </el-form-item>
        <el-form-item label="Top P">
          <el-slider v-model="form.top_p" :min="0" :max="1" :step="0.05" />
        </el-form-item>
        <el-form-item label="额外参数">
          <el-input
            v-model="form.extra_params_text"
            type="textarea"
            :rows="4"
            placeholder='例如: {"frequency_penalty":0.2}'
          />
        </el-form-item>
        <el-form-item label="模型目录">
          <div class="ai-model-manager">
            <div class="ai-model-manager__toolbar">
              <div class="ai-model-manager__summary">
                <strong>从当前 URL 拉取模型列表</strong>
                <span>新拉到的模型默认都会开放给前端选择；已保存的供应商在这里切换开关会立即保存，新建供应商则在底部统一保存。</span>
              </div>
              <div class="ai-model-manager__actions">
                <el-button :loading="modelSyncing" :disabled="catalogSaving" @click="syncModelCatalog">
                  拉取模型
                </el-button>
                <el-button :disabled="catalogSaving" @click="addManualModel">
                  手动添加
                </el-button>
              </div>
            </div>

            <div v-if="form.model_catalog.length" class="ai-model-manager__table">
              <div class="ai-model-manager__row ai-model-manager__row--head">
                <span>模型 ID</span>
                <span>前端显示名称</span>
                <span>前端启用</span>
                <span>操作</span>
              </div>
              <div
                v-for="item in form.model_catalog"
                :key="item.local_key"
                class="ai-model-manager__row"
              >
                <el-input
                  v-if="item.is_manual"
                  v-model="item.id"
                  @change="handleModelCatalogMutation"
                  :disabled="catalogSaving"
                  placeholder="例如: qwen-plus"
                />
                <code v-else class="ai-model-manager__id">{{ item.id }}</code>
                <el-input v-model="item.display_name" :disabled="catalogSaving" @change="handleModelCatalogMutation" placeholder="前端显示名称" />
                <el-switch v-model="item.visible" :disabled="catalogSaving" @change="handleModelCatalogMutation" />
                <button class="ai-model-manager__remove" :disabled="catalogSaving" @click="removeModel(item.local_key)">
                  删除
                </button>
              </div>
            </div>

            <div v-else class="ai-model-manager__empty">
              点击“拉取模型”可从当前 URL 获取模型列表并默认开放给前端；如果供应商不返回完整列表，也可以手动添加模型。
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button :loading="formTesting" @click="testCurrentConfig">测试连接</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Settings, Sparkles, Brain } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import http from '@/utils/http';

interface AIModelCatalogItem {
  local_key: string;
  id: string;
  display_name: string;
  visible: boolean;
  is_manual?: boolean;
}

interface AIConfig {
  id: number;
  name: string;
  provider: string;
  base_url: string;
  model: string;
  default_model_display_name?: string;
  visible_model_count?: number;
  is_active: boolean;
  temperature: number;
  max_tokens?: number | null;
  top_p: number;
  model_catalog?: AIModelCatalogItem[];
  icon: any;
  color: string;
}

const configs = ref<AIConfig[]>([]);
const showAddDialog = ref(false);
const editingId = ref<number | null>(null);
const testingId = ref<number | null>(null);
const formTesting = ref(false);
const modelSyncing = ref(false);
const catalogSaving = ref(false);
let modelLocalSeed = 0;
const form = ref({
  name: '',
  provider: 'qwen',
  api_key: '',
  base_url: '',
  model: '',
  temperature: 0.7,
  top_p: 0.95,
  extra_params_text: '',
  model_catalog: [] as AIModelCatalogItem[],
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
    const data: any = await http.get('/admin/ai-configs');
    configs.value = (data.data || []).map((c: any) => ({
      ...c,
      ...providerMeta[c.provider] || providerMeta.custom,
    }));
  } catch {
    configs.value = [];
  }
}

async function editConfig(config: AIConfig) {
  editingId.value = config.id;
  form.value = {
    name: config.name,
    provider: config.provider,
    api_key: '',
    base_url: config.base_url,
    model: config.model,
    temperature: config.temperature,
    top_p: config.top_p,
    extra_params_text: JSON.stringify((config as any).extra_params || {}, null, 2),
    model_catalog: [],
  };
  showAddDialog.value = true;

  try {
    const detail: any = await http.get(`/admin/ai-configs/${config.id}/models`);
    form.value.model_catalog = normalizeModelCatalog(detail.data?.models || []);
    form.value.model = detail.data?.default_model || config.model;
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '加载模型目录失败');
  }
}

function openCreateDialog() {
  resetForm();
  showAddDialog.value = true;
}

function closeDialog() {
  showAddDialog.value = false;
  resetForm();
}

function buildExtraParams() {
  const raw = form.value.extra_params_text.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error('额外参数必须是合法的 JSON 对象');
  }
}

function serializeModelCatalog(options: { strict?: boolean } = {}) {
  const strict = options.strict !== false;
  const modelIds = new Set<string>();
  const catalog: Array<{ id: string; display_name: string; visible: boolean }> = [];

  for (const item of form.value.model_catalog) {
    const id = item.id.trim();
    if (!id) {
      if (strict) {
        throw new Error('模型 ID 不能为空');
      }
      continue;
    }
    if (modelIds.has(id)) {
      if (strict) {
        throw new Error(`模型 ID 重复: ${id}`);
      }
      continue;
    }
    modelIds.add(id);
    catalog.push({
      id,
      display_name: item.display_name.trim() || id,
      visible: item.visible,
    });
  }

  return catalog;
}

function buildPayload() {
  const payload: Record<string, any> = {
    name: form.value.name,
    provider: form.value.provider,
    base_url: form.value.base_url,
    model: form.value.model,
    temperature: form.value.temperature,
    top_p: form.value.top_p,
    extra_params: buildExtraParams(),
  };

  if (form.value.model_catalog.length) {
    payload.model_catalog = serializeModelCatalog({ strict: true });
  }

  return payload;
}

function resetForm() {
  editingId.value = null;
  modelLocalSeed = 0;
  form.value = {
    name: '',
    provider: 'qwen',
    api_key: '',
    base_url: '',
    model: '',
    temperature: 0.7,
    top_p: 0.95,
    extra_params_text: '',
    model_catalog: [],
  };
}

function normalizeModelCatalog(models: any[] = []) {
  return models.map((item: any) => ({
    local_key: `model-${Date.now()}-${modelLocalSeed++}`,
    id: String(item.id || '').trim(),
    display_name: String(item.display_name || item.name || item.id || '').trim(),
    visible: Boolean(item.visible),
    is_manual: Boolean(item.is_manual),
  }));
}

function addManualModel() {
  form.value.model_catalog.push({
    local_key: `model-${Date.now()}-${modelLocalSeed++}`,
    id: '',
    display_name: '',
    visible: true,
    is_manual: true,
  });
}

async function persistModelCatalog(options: { successMessage?: string; silent?: boolean; strict?: boolean } = {}) {
  if (!editingId.value) return false;

  try {
    const models = serializeModelCatalog({ strict: options.strict !== false });
    catalogSaving.value = true;
    const response: any = await http.put(`/admin/ai-configs/${editingId.value}/models`, {
      default_model: form.value.model,
      models,
    });
    form.value.model_catalog = normalizeModelCatalog(response.data?.models || models);
    form.value.model = response.data?.default_model || form.value.model;
    await fetchConfigs();

    if (!options.silent) {
      ElMessage.success(options.successMessage || response.message || '模型目录已保存');
    }
    return true;
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '模型目录保存失败');
    return false;
  } finally {
    catalogSaving.value = false;
  }
}

async function handleModelCatalogMutation() {
  if (!editingId.value) return;
  await persistModelCatalog({ successMessage: '模型启用状态已保存', strict: false });
}

async function handleDefaultModelChange() {
  if (!editingId.value || !form.value.model_catalog.length) return;
  await persistModelCatalog({ successMessage: '默认模型已保存', strict: false });
}

async function removeModel(localKey: string) {
  const removed = form.value.model_catalog.find((item) => item.local_key === localKey);
  form.value.model_catalog = form.value.model_catalog.filter((item) => item.local_key !== localKey);

  if (removed?.id && form.value.model === removed.id) {
    form.value.model = form.value.model_catalog[0]?.id || '';
  }

  if (editingId.value && removed?.id) {
    await persistModelCatalog({ successMessage: '模型目录已保存', strict: false });
  }
}

async function syncModelCatalog() {
  modelSyncing.value = true;
  try {
    const payload: Record<string, any> = {
      name: form.value.name,
      provider: form.value.provider,
      base_url: form.value.base_url,
      model: form.value.model,
      temperature: form.value.temperature,
      top_p: form.value.top_p,
      extra_params: buildExtraParams(),
    };
    const modelCatalog = serializeModelCatalog({ strict: false });
    if (modelCatalog.length) {
      payload.model_catalog = modelCatalog;
    }

    if (editingId.value) {
      payload.config_id = editingId.value;
    }
    if (form.value.api_key) {
      payload.api_key = form.value.api_key;
    }

    const response: any = await http.post('/admin/ai-configs/models/fetch', payload);
    form.value.model_catalog = normalizeModelCatalog(response.data?.models || []);
    form.value.model = response.data?.default_model || form.value.model;
    if (editingId.value) {
      const saved = await persistModelCatalog({
        successMessage: response.message || `已同步并保存 ${form.value.model_catalog.length} 个模型`,
        silent: true,
        strict: false,
      });
      if (saved) {
        ElMessage.success(response.message || `已同步并保存 ${form.value.model_catalog.length} 个模型`);
      }
    } else {
      ElMessage.success(response.message || `已同步 ${form.value.model_catalog.length} 个模型`);
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '同步模型失败');
  } finally {
    modelSyncing.value = false;
  }
}

async function saveConfig() {
  try {
    const payload: Record<string, any> = buildPayload();

    if (form.value.api_key) {
      payload.api_key = form.value.api_key;
    }

    if (editingId.value) {
      await http.put(`/admin/ai-configs/${editingId.value}`, payload);
    } else {
      await http.post('/admin/ai-configs', {
        ...payload,
        api_key: form.value.api_key,
      });
    }
    ElMessage.success('保存成功');
    closeDialog();
    await fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败');
  }
}

async function testCurrentConfig() {
  formTesting.value = true;
  try {
    if (editingId.value && !form.value.api_key) {
      await http.post(`/admin/ai-configs/${editingId.value}/test`);
    } else {
      await http.post('/admin/ai-configs/test', {
        ...buildPayload(),
        api_key: form.value.api_key,
      });
    }
    ElMessage.success('连接测试成功');
    await fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '连接测试失败');
  } finally {
    formTesting.value = false;
  }
}

async function testConfig(id: number) {
  testingId.value = id;
  try {
    await http.post(`/admin/ai-configs/${id}/test`);
    ElMessage.success('连接测试成功');
    await fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '连接测试失败');
  } finally {
    testingId.value = null;
  }
}

async function activateConfig(id: number) {
  try {
    await http.post(`/admin/ai-configs/${id}/activate`);
    ElMessage.success('已切换活跃供应商');
    await fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '切换失败');
  }
}

async function deleteConfig(id: number) {
  try {
    await http.delete(`/admin/ai-configs/${id}`);
    ElMessage.success('已删除');
    await fetchConfigs();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败');
  }
}

onMounted(fetchConfigs);
</script>
