<template>
  <!-- 后台：商品/套餐管理 -->
  <div>
    <div class="admin-main__header" style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1 class="admin-main__title">商品管理</h1>
        <p class="admin-main__desc">管理会员套餐、定价和功能配置</p>
      </div>
      <button class="create-btn" @click="openCreateDialog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新增套餐
      </button>
    </div>

    <!-- 套餐卡片列表 -->
    <div class="product-grid">
      <div v-for="product in products" :key="product.id" class="product-card" :class="'product-card--' + product.color">
        <!-- 卡片头部 -->
        <div class="product-header">
          <div>
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-desc">{{ product.desc }}</p>
          </div>
          <span class="product-status" :class="{ 'product-status--active': product.enabled }">
            {{ product.enabled ? '启用中' : '已停用' }}
          </span>
        </div>

        <!-- 定价明细 -->
        <div class="price-grid">
          <div class="price-item">
            <span class="price-label">月付</span>
            <span class="price-value">¥{{ product.prices.monthly }}</span>
          </div>
          <div class="price-item">
            <span class="price-label">季付</span>
            <span class="price-value">¥{{ product.prices.quarterly }}</span>
          </div>
          <div class="price-item">
            <span class="price-label">年付</span>
            <span class="price-value">¥{{ product.prices.yearly }}</span>
          </div>
        </div>

        <!-- 功能特性 -->
        <div class="product-features">
          <div v-for="feat in product.features" :key="feat" class="feat-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{{ feat }}</span>
          </div>
        </div>

        <!-- 操作 -->
        <div class="product-actions">
          <button class="edit-btn" @click="editProduct(product)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            编辑
          </button>
          <button class="toggle-btn-action" @click="toggleProduct(product)">
            {{ product.enabled ? '停用' : '启用' }}
          </button>
          <button class="toggle-btn-action toggle-btn-action--danger" @click="removeProduct(product)">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 新增套餐对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-card">
        <h3 class="dialog-title">{{ editingProduct ? '编辑套餐' : '新增套餐' }}</h3>

        <div class="dialog-form">
          <div class="form-row">
            <label>套餐编码</label>
            <input v-model="newProduct.code" placeholder="如 basic / pro / enterprise" />
          </div>
          <div class="form-row">
            <label>套餐名称</label>
            <input v-model="newProduct.name" placeholder="输入套餐名称" />
          </div>
          <div class="form-row">
            <label>套餐描述</label>
            <input v-model="newProduct.desc" placeholder="简短描述" />
          </div>
          <div class="form-row form-row--prices">
            <div>
              <label>月付价格</label>
              <input v-model.number="newProduct.prices.monthly" type="number" placeholder="0" />
            </div>
            <div>
              <label>季付价格</label>
              <input v-model.number="newProduct.prices.quarterly" type="number" placeholder="0" />
            </div>
            <div>
              <label>年付价格</label>
              <input v-model.number="newProduct.prices.yearly" type="number" placeholder="0" />
            </div>
          </div>
          <div class="form-row">
            <label>功能特性（每行一个）</label>
            <textarea v-model="newProduct.featuresText" rows="4" placeholder="无限项目&#10;5GB 存储空间&#10;AI 辅助写作" />
          </div>
        </div>

        <div class="dialog-actions">
          <button class="dialog-btn dialog-btn--cancel" @click="closeDialog">取消</button>
          <button class="dialog-btn dialog-btn--confirm" @click="saveProduct">{{ editingProduct ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';

interface Product {
  id: string;
  code?: string;
  name: string;
  desc: string;
  color: string;
  enabled: boolean;
  prices: { monthly: number; quarterly: number; yearly: number };
  features: string[];
}

const products = ref<Product[]>([]);

const showCreateDialog = ref(false);
const editingProduct = ref<Product | null>(null);

const newProduct = reactive({
  code: '',
  name: '',
  desc: '',
  color: 'blue',
  prices: { monthly: 0, quarterly: 0, yearly: 0 },
  featuresText: '',
});

onMounted(() => {
  fetchProducts();
});

function openCreateDialog() {
  resetForm();
  showCreateDialog.value = true;
}

function closeDialog() {
  resetForm();
  showCreateDialog.value = false;
}

async function fetchProducts() {
  try {
    const res: any = await http.get('/admin/products');
    if (res.success) {
      products.value = res.data.list || [];
    }
  } catch {
    ElMessage.error('加载套餐失败');
  }
}

function editProduct(product: Product) {
  editingProduct.value = product;
  newProduct.code = product.code || product.id;
  newProduct.name = product.name;
  newProduct.desc = product.desc;
  newProduct.color = product.color || 'blue';
  newProduct.prices.monthly = product.prices.monthly;
  newProduct.prices.quarterly = product.prices.quarterly;
  newProduct.prices.yearly = product.prices.yearly;
  newProduct.featuresText = product.features.join('\n');
  showCreateDialog.value = true;
}

async function toggleProduct(product: Product) {
  try {
    const res: any = await http.put(`/admin/products/${product.id}`, {
      enabled: !product.enabled,
    });
    if (res.success) {
      await fetchProducts();
      ElMessage.success(product.enabled ? '套餐已停用' : '套餐已启用');
    }
  } catch {
    ElMessage.error('更新套餐状态失败');
  }
}

async function saveProduct() {
  const features = newProduct.featuresText.split('\n').filter(f => f.trim());
  const payload = {
    code: newProduct.code,
    name: newProduct.name,
    desc: newProduct.desc,
    color: newProduct.color,
    prices: { ...newProduct.prices },
    features,
  };

  try {
    if (editingProduct.value) {
      await http.put(`/admin/products/${editingProduct.value.id}`, payload);
      ElMessage.success('套餐已更新');
    } else {
      await http.post('/admin/products', payload);
      ElMessage.success('套餐已创建');
    }
    await fetchProducts();
    resetForm();
    showCreateDialog.value = false;
  } catch {
    ElMessage.error(editingProduct.value ? '更新失败' : '创建失败');
  }
}

async function removeProduct(product: Product) {
  try {
    await ElMessageBox.confirm(`确定删除套餐「${product.name}」吗？`, '删除套餐', { type: 'warning' });
    await http.delete(`/admin/products/${product.id}`);
    ElMessage.success('套餐已删除');
    await fetchProducts();
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err?.response?.data?.message || '删除失败');
    }
  }
}

function resetForm() {
  newProduct.code = '';
  newProduct.name = '';
  newProduct.desc = '';
  newProduct.color = 'blue';
  newProduct.prices.monthly = 0;
  newProduct.prices.quarterly = 0;
  newProduct.prices.yearly = 0;
  newProduct.featuresText = '';
  editingProduct.value = null;
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: $layout-sider-dark;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.85; }
}

.toggle-btn-action--danger {
  color: #DC2626;
}

/* 套餐网格 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* 套餐卡片：上圆角 下直角 */
.product-card {
  border-radius: 12px 12px 0 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--blue { background: #BAE6FD; }
  &--pink { background: #FBCFE8; }
  &--purple { background: #DDD6FE; }
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0 0 2px 0;
}

.product-desc {
  font-size: 0.8rem;
  color: rgba(0,0,0,0.5);
  margin: 0;
}

.product-status {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(0,0,0,0.08);
  color: rgba(0,0,0,0.5);

  &--active { background: rgba(16,185,129,0.15); color: #059669; }
}

/* 定价明细 */
.price-grid {
  display: flex;
  gap: 12px;
}

.price-item {
  flex: 1;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
  padding: 8px 10px;
  text-align: center;
}

.price-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0,0,0,0.4);
  margin-bottom: 2px;
}

.price-value {
  font-size: 1rem;
  font-weight: 800;
  color: $layout-sider-dark;
}

/* 功能特性 */
.product-features {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: rgba(0,0,0,0.6);
}

/* 操作按钮 */
.product-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.edit-btn, .toggle-btn-action {
  flex: 1;
  height: 32px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
}

.edit-btn {
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.1);
  color: $layout-sider-dark;
  &:hover { background: rgba(255,255,255,0.9); }
}

.toggle-btn-action {
  background: transparent;
  border: 1px solid rgba(0,0,0,0.1);
  color: rgba(0,0,0,0.5);
  &:hover { background: rgba(0,0,0,0.05); }
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-card {
  width: 480px;
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 28px;
}

.dialog-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0 0 20px 0;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(0,0,0,0.5);
  }

  input, textarea {
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.85rem;
    color: $layout-sider-dark;
    outline: none;
    resize: none;
    font-family: inherit;

    &:focus { border-color: $layout-sider-dark; }
    &::placeholder { color: rgba(0,0,0,0.25); }
  }

  &--prices {
    flex-direction: row;
    gap: 10px;
    > div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  }
}

.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.dialog-btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  &--cancel {
    background: transparent;
    border: 1px solid #E5E7EB;
    color: rgba(0,0,0,0.5);
    &:hover { background: #f5f5f5; }
  }

  &--confirm {
    background: $layout-sider-dark;
    color: #ffffff;
    &:hover { opacity: 0.85; }
  }
}
</style>
