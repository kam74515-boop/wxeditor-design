<template>
  <div class="ai-config-page">
    <div class="ai-config-header">
      <div>
        <h1 class="ai-config-header__title">AI 配置</h1>
        <p class="ai-config-header__desc">管理 AI 供应商和模型配置</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="ai-config-tabs">
      <!-- 模型配置 -->
      <el-tab-pane label="模型配置" name="models">
        <div class="section">
          <div class="section__header">
            <div class="section__info">
              <span class="section__count">{{ enabledCount }} / {{ models.length }} 已启用</span>
            </div>
            <el-button size="small" @click="openModelDialog()">
              <Plus :size="14" class="mr-1" />
              添加模型
            </el-button>
          </div>
          <div class="model-list">
            <div v-for="(model, index) in models" :key="model.id" :class="['model-item', { 'model-item--enabled': model.visible }]">
              <div class="model-item__order">
                <el-button size="small" text :disabled="index === 0" @click="moveModel(index, -1)">
                  <ArrowUp :size="14" />
                </el-button>
                <span class="model-item__number">#{{ index + 1 }}</span>
                <el-button size="small" text :disabled="index === models.length - 1" @click="moveModel(index, 1)">
                  <ArrowDown :size="14" />
                </el-button>
              </div>
              <div class="model-item__main">
                <div class="model-item__info">
                  <span class="model-item__name">{{ model.display_name }}</span>
                  <code class="model-item__id">{{ model.model_id }}</code>
                </div>
                <div class="model-item__meta">
                  <el-select v-model="model.supplier_id" size="small" style="width: 120px" @change="updateModel(model)">
                    <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
                  </el-select>
                  <el-select v-model="model.fallback_model_id" size="small" clearable placeholder="降级模型" style="width: 140px" @change="updateModel(model)">
                    <el-option v-for="m in models.filter(m2 => m2.id !== model.id)" :key="m.id" :label="m.display_name" :value="m.id" />
                  </el-select>
                </div>
              </div>
              <div class="model-item__params">
                <div class="param-item">
                  <span class="param-item__label">Temperature</span>
                  <el-input-number v-model="model.temperature" :min="0" :max="2" :step="0.1" size="small" controls-position="right" style="width: 100px" @change="updateModel(model)" />
                </div>
                <div class="param-item">
                  <span class="param-item__label">Top P</span>
                  <el-input-number v-model="model.top_p" :min="0" :max="1" :step="0.05" size="small" controls-position="right" style="width: 100px" @change="updateModel(model)" />
                </div>
              </div>
              <div class="model-item__toggle">
                <el-switch v-model="model.visible" size="large" @change="updateModel(model)" />
              </div>
              <div class="model-item__delete">
                <el-button size="small" type="danger" text @click="deleteModel(model.id)">
                  <Trash2 :size="14" />
                </el-button>
              </div>
            </div>
            <div v-if="models.length === 0" class="empty-state">暂无模型，请先添加供应商并同步模型</div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 供应商配置 -->
      <el-tab-pane label="供应商配置" name="suppliers">
        <div class="section">
          <div class="section__header">
            <span></span>
            <el-button size="small" @click="openSupplierDialog()">
              <Plus :size="14" class="mr-1" />
              添加供应商
            </el-button>
          </div>
          <div class="supplier-list">
            <div v-for="supplier in suppliers" :key="supplier.id" class="supplier-card">
              <div class="supplier-card__info">
                <span class="supplier-card__name">{{ supplier.name }}</span>
                <code class="supplier-card__url">{{ supplier.base_url }}</code>
              </div>
              <div class="supplier-card__actions">
                <el-button size="small" text @click="testSupplier(supplier.id)" :loading="testingId === supplier.id">测试</el-button>
                <el-button size="small" text @click="syncSupplierModels(supplier.id)" :loading="syncingId === supplier.id">同步模型</el-button>
                <el-button size="small" text @click="openSupplierDialog(supplier)">编辑</el-button>
                <el-button size="small" type="danger" text @click="deleteSupplier(supplier.id)">删除</el-button>
              </div>
            </div>
            <div v-if="suppliers.length === 0" class="empty-state">暂无供应商，请先添加</div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="supplierDialogVisible" :title="editingSupplierId ? '编辑供应商' : '添加供应商'" width="480px">
      <el-form :model="supplierForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="supplierForm.name" placeholder="例如: 通义千问" /></el-form-item>
        <el-form-item label="API Key"><el-input v-model="supplierForm.api_key" type="password" show-password placeholder="sk-..." /></el-form-item>
        <el-form-item label="Base URL"><el-input v-model="supplierForm.base_url" placeholder="https://..." /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSupplier">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="modelDialogVisible" title="添加模型" width="480px">
      <el-form :model="modelForm" label-width="80px">
        <el-form-item label="模型 ID"><el-input v-model="modelForm.model_id" placeholder="例如: qwen3.5-plus" /></el-form-item>
        <el-form-item label="显示名称"><el-input v-model="modelForm.display_name" placeholder="例如: 通义千问 3.5" /></el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="modelForm.supplier_id" placeholder="选择供应商" style="width: 100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveModel">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';

interface Supplier { id: number; name: string; base_url: string; }
interface Model { id: number; model_id: string; display_name: string; supplier_id: number; supplier_name: string; visible: boolean; temperature: number; top_p: number; max_tokens: number | null; sort_order: number; fallback_model_id: number | null; }

const activeTab = ref('models');
const suppliers = ref<Supplier[]>([]);
const models = ref<Model[]>([]);
const supplierDialogVisible = ref(false);
const modelDialogVisible = ref(false);
const editingSupplierId = ref<number | null>(null);
const testingId = ref<number | null>(null);
const syncingId = ref<number | null>(null);
const supplierForm = ref({ name: '', api_key: '', base_url: '' });
const modelForm = ref({ model_id: '', display_name: '', supplier_id: null as number | null });

const enabledCount = computed(() => models.value.filter(m => m.visible).length);

async function loadSuppliers() { try { const res: any = await http.get('/admin/ai-configs/suppliers'); suppliers.value = res.data || []; } catch { suppliers.value = []; } }
function openSupplierDialog(supplier?: Supplier) { editingSupplierId.value = supplier?.id || null; supplierForm.value = { name: supplier?.name || '', api_key: '', base_url: supplier?.base_url || '' }; supplierDialogVisible.value = true; }
async function saveSupplier() { try { if (editingSupplierId.value) { await http.put(`/admin/ai-configs/suppliers/${editingSupplierId.value}`, supplierForm.value); } else { await http.post('/admin/ai-configs/suppliers', supplierForm.value); } ElMessage.success('保存成功'); supplierDialogVisible.value = false; await loadSuppliers(); } catch (err: any) { ElMessage.error(err?.response?.data?.message || '保存失败'); } }
async function testSupplier(id: number) { testingId.value = id; try { await http.post(`/admin/ai-configs/suppliers/${id}/test`); ElMessage.success('连接成功'); } catch (err: any) { ElMessage.error(err?.response?.data?.message || '连接失败'); } finally { testingId.value = null; } }
async function syncSupplierModels(id: number) { syncingId.value = id; try { await http.post(`/admin/ai-configs/suppliers/${id}/sync`); ElMessage.success('同步成功'); await loadModels(); } catch (err: any) { ElMessage.error(err?.response?.data?.message || '同步失败'); } finally { syncingId.value = null; } }
async function deleteSupplier(id: number) { try { await ElMessageBox.confirm('确定删除此供应商？', '确认', { type: 'warning' }); await http.delete(`/admin/ai-configs/suppliers/${id}`); ElMessage.success('已删除'); await loadSuppliers(); await loadModels(); } catch (err: any) { if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || '删除失败'); } }

async function loadModels() { 
  try { 
    const res: any = await http.get('/admin/ai-configs/models'); 
    models.value = (res.data || []).map((m: any) => ({ 
      ...m, 
      visible: Boolean(m.visible),
      temperature: Number(m.temperature) || 0.7, 
      top_p: Number(m.top_p) || 0.95 
    })); 
  } catch { 
    models.value = []; 
  } 
}
async function updateModel(model: Model) { try { await http.put(`/admin/ai-configs/models/${model.id}`, { display_name: model.display_name, visible: model.visible, temperature: model.temperature, top_p: model.top_p, max_tokens: model.max_tokens, supplier_id: model.supplier_id, fallback_model_id: model.fallback_model_id }); } catch (err: any) { ElMessage.error(err?.response?.data?.message || '更新失败'); await loadModels(); } }
async function moveModel(index: number, direction: number) { const newIndex = index + direction; if (newIndex < 0 || newIndex >= models.value.length) return; const temp = models.value[index]; models.value[index] = models.value[newIndex]; models.value[newIndex] = temp; try { await http.put('/admin/ai-configs/models-order', { models: models.value.map((m, i) => ({ id: m.id, sort_order: i })) }); } catch { await loadModels(); } }
async function deleteModel(id: number) { try { await ElMessageBox.confirm('确定删除此模型？', '确认', { type: 'warning' }); await http.delete(`/admin/ai-configs/models/${id}`); ElMessage.success('已删除'); await loadModels(); } catch (err: any) { if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || '删除失败'); } }

function openModelDialog() { 
  if (suppliers.value.length === 0) {
    ElMessage.warning('请先添加供应商');
    return;
  }
  modelForm.value = { model_id: '', display_name: '', supplier_id: suppliers.value[0]?.id || null }; 
  modelDialogVisible.value = true; 
}
async function saveModel() { 
  if (!modelForm.value.model_id || !modelForm.value.supplier_id) {
    ElMessage.warning('请填写模型 ID 并选择供应商');
    return;
  }
  try { 
    await http.post('/admin/ai-configs/models', modelForm.value); 
    ElMessage.success('模型已添加'); 
    modelDialogVisible.value = false; 
    await loadModels(); 
  } catch (err: any) { 
    console.error('保存模型失败:', err);
    ElMessage.error(err?.response?.data?.message || err?.message || '添加失败'); 
  } 
}

onMounted(async () => { await loadSuppliers(); await loadModels(); });
</script>

<style scoped lang="scss">
.ai-config-page { display: flex; flex-direction: column; height: 100%; }
.ai-config-header { margin-bottom: 16px; &__title { font-size: 22px; font-weight: 800; color: #1a1a1a; margin: 0 0 4px; } &__desc { font-size: 14px; color: rgba(0,0,0,0.45); margin: 0; } }
.ai-config-tabs { flex: 1; display: flex; flex-direction: column; :deep(.el-tabs__content) { flex: 1; overflow: auto; } }
.section { &__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; } &__info { display: flex; align-items: center; gap: 8px; } &__count { font-size: 13px; color: rgba(0,0,0,0.45); } }
.supplier-list { display: flex; flex-direction: column; gap: 8px; }
.supplier-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; &__info { display: flex; flex-direction: column; gap: 2px; } &__name { font-size: 14px; font-weight: 600; color: #1a1a1a; } &__url { font-size: 12px; color: rgba(0,0,0,0.4); font-family: monospace; } &__actions { display: flex; gap: 4px; } }
.model-list { display: flex; flex-direction: column; gap: 8px; }
.model-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; &--enabled { border-color: #22c55e; background: #f0fdf4; } &__order { display: flex; flex-direction: column; align-items: center; gap: 0; .el-button { padding: 4px; } } &__number { font-size: 11px; font-weight: 700; color: rgba(0,0,0,0.3); line-height: 1; } &__main { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; } &__info { display: flex; flex-direction: column; gap: 2px; } &__name { font-size: 14px; font-weight: 600; color: #1a1a1a; } &__id { font-size: 11px; color: rgba(0,0,0,0.4); font-family: monospace; } &__meta { display: flex; gap: 8px; align-items: center; } &__params { display: flex; gap: 12px; align-items: center; } &__toggle { margin-left: auto; } &__delete { .el-button { padding: 4px; } } }
.param-item { display: flex; align-items: center; gap: 6px; &__label { font-size: 11px; color: rgba(0,0,0,0.4); white-space: nowrap; } }
.empty-state { padding: 32px; text-align: center; color: rgba(0,0,0,0.45); background: #f9fafb; border-radius: 10px; }
.mr-1 { margin-right: 4px; }
</style>
