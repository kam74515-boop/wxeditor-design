<template>
  <!-- 管理后台 — 数据分析 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">数据分析</h1>
      <div style="display: flex; gap: 8px;">
        <button
          v-for="p in periods"
          :key="p.value"
          :class="['pricing-toggle__option', { 'pricing-toggle__option--active': period === p.value }]"
          @click="changePeriod(p.value)"
        >{{ p.label }}</button>
      </div>
    </div>
    <p class="admin-main__desc">用户增长趋势、内容发布统计、收入概览与热门模板排行。</p>

    <!-- 关键指标 -->
    <div class="stats-row" style="margin-bottom: 28px;" v-loading="loading">
      <div class="stat-card" v-for="m in metricCards" :key="m.label">
        <span class="stat-card__label">{{ m.label }}</span>
        <span class="stat-card__value">{{ m.value }}</span>
        <span
          :class="['stat-card__change', m.change >= 0 ? 'stat-card__change--up' : 'stat-card__change--down']"
        >{{ m.change >= 0 ? '↑' : '↓' }} {{ Math.abs(m.change) }}%</span>
      </div>
    </div>

    <!-- 图表区：用户增长趋势 + 内容发布统计 -->
    <div style="display: flex; gap: 16px; margin-bottom: 16px;">
      <!-- 折线图：用户增长趋势 -->
      <div class="card" style="flex: 1; padding: 20px;">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1D1D1F;">用户增长趋势</h3>
        <div class="chart-container">
          <div class="chart-y-axis">
            <span v-for="tick in userChartYTicks" :key="tick">{{ tick }}</span>
          </div>
          <div class="chart-area">
            <div class="chart-grid-lines">
              <div v-for="i in 5" :key="i" class="chart-grid-line"></div>
            </div>
            <svg class="chart-svg" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" preserveAspectRatio="none">
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <polygon
                :points="userChartArea"
                fill="url(#userGrad)"
              />
              <polyline
                :points="userChartLine"
                fill="none"
                stroke="#3B82F6"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="chart-tooltip" v-if="hoveredUserIndex >= 0" :style="{ left: tooltipUserX + 'px' }">
              <span class="chart-tooltip__label">{{ userChartData[hoveredUserIndex]?.date }}</span>
              <span class="chart-tooltip__value">{{ userChartData[hoveredUserIndex]?.count }} 人</span>
            </div>
            <div class="chart-x-labels">
              <span v-for="(d, i) in userChartData" :key="i" style="flex: 1; text-align: center;">
                {{ d.date.slice(-5) }}
              </span>
            </div>
            <!-- hover bar overlays -->
            <div
              v-for="(_, i) in userChartData"
              :key="'h'+i"
              class="chart-hover-bar"
              :style="getHoverBarStyle(i, userChartData.length)"
              @mouseenter="hoveredUserIndex = i"
              @mouseleave="hoveredUserIndex = -1"
            ></div>
          </div>
        </div>
      </div>

      <!-- 柱状图：内容发布统计 -->
      <div class="card" style="flex: 1; padding: 20px;">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1D1D1F;">内容发布统计</h3>
        <div class="chart-container">
          <div class="chart-y-axis">
            <span v-for="tick in contentChartYTicks" :key="tick">{{ tick }}</span>
          </div>
          <div class="chart-area">
            <div class="chart-grid-lines">
              <div v-for="i in 5" :key="i" class="chart-grid-line"></div>
            </div>
            <div class="bar-chart">
              <div
                v-for="(bar, i) in contentChartData"
                :key="i"
                class="bar-chart__item"
              >
                <div
                  class="bar-chart__bar"
                  :style="{ height: bar.percent + '%' }"
                  :title="`${bar.date}: ${bar.count} 篇`"
                ></div>
                <span class="bar-chart__label">{{ bar.date.slice(-5) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收入概览 + 热门模板排行 -->
    <div style="display: flex; gap: 16px;">
      <!-- 收入概览 -->
      <div class="card" style="flex: 1; padding: 20px;">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1D1D1F;">收入概览</h3>
        <div class="revenue-overview">
          <div class="revenue-overview__total">
            <span class="revenue-overview__label">总收入</span>
            <span class="revenue-overview__amount">¥{{ revenueSummary.total.toLocaleString() }}</span>
          </div>
          <div class="revenue-overview__breakdown">
            <div class="revenue-overview__item" v-for="item in revenueSummary.breakdown" :key="item.name">
              <div class="revenue-overview__bar-wrap">
                <div class="revenue-overview__bar" :style="{ width: item.percent + '%', background: item.color }"></div>
              </div>
              <div class="revenue-overview__meta">
                <span style="font-weight: 600; font-size: 13px;">{{ item.name }}</span>
                <span style="font-size: 13px; color: rgba(0,0,0,0.5);">¥{{ item.amount.toLocaleString() }}（{{ item.percent }}%）</span>
              </div>
            </div>
          </div>
        </div>
        <table class="admin-table" style="margin-top: 16px;">
          <thead><tr><th>日期</th><th>订单数</th><th>金额</th><th>环比</th></tr></thead>
          <tbody>
            <tr v-for="row in revenueData" :key="row.date">
              <td>{{ row.date }}</td>
              <td>{{ row.orders }}</td>
              <td style="font-weight: 700;">¥{{ row.amount }}</td>
              <td>
                <span
                  :class="row.change >= 0 ? 'stat-card__change--up' : 'stat-card__change--down'"
                  style="font-weight: 600; font-size: 13px;"
                >{{ row.change >= 0 ? '↑' : '↓' }} {{ Math.abs(row.change) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 热门模板排行 -->
      <div class="card" style="width: 360px; padding: 20px;">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #1D1D1F;">热门模板排行</h3>
        <div class="template-rank">
          <div v-for="(tpl, i) in topTemplates" :key="tpl.name" class="template-rank__item">
            <span class="template-rank__index" :class="{ 'template-rank__index--top': i < 3 }">{{ i + 1 }}</span>
            <div class="template-rank__info">
              <span class="template-rank__name">{{ tpl.name }}</span>
              <span class="template-rank__category">{{ tpl.category }}</span>
            </div>
            <div class="template-rank__usage">
              <div class="template-rank__bar-wrap">
                <div class="template-rank__bar" :style="{ width: tpl.barPercent + '%' }"></div>
              </div>
              <span class="template-rank__count">{{ tpl.useCount }} 次</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import http from '@/utils/http';

const loading = ref(false);
const period = ref('7d');
const periods = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
];

function changePeriod(p: string) {
  period.value = p;
  fetchAnalytics();
}

// ===== 指标卡片 =====
const metricCards = computed(() => {
  const d = analyticsData.value;
  return [
    { label: '新增用户', value: d.newUsers.toLocaleString(), change: d.changes.newUsers },
    { label: '文档创建', value: d.docCreated.toLocaleString(), change: d.changes.docCreated },
    { label: 'AI 调用次数', value: d.aiCalls.toLocaleString(), change: d.changes.aiCalls },
    { label: '收入 (元)', value: `¥${d.revenue.toLocaleString()}`, change: d.changes.revenue },
  ];
});

// ===== 用户增长趋势 =====
const chartWidth = 500;
const chartHeight = 200;
const chartPadding = 10;

const hoveredUserIndex = ref(-1);
const tooltipUserX = computed(() => {
  if (hoveredUserIndex.value < 0) return 0;
  const count = userChartData.value.length;
  return (hoveredUserIndex.value / Math.max(count - 1, 1)) * (chartWidth - chartPadding * 2) + chartPadding;
});

const userChartLine = computed(() => {
  const data = userChartData.value;
  if (!data.length) return '';
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const w = chartWidth - chartPadding * 2;
  const h = chartHeight - chartPadding * 2;
  return data.map((d, i) => {
    const x = chartPadding + (i / Math.max(data.length - 1, 1)) * w;
    const y = chartPadding + h - (d.count / maxVal) * h;
    return `${x},${y}`;
  }).join(' ');
});

const userChartArea = computed(() => {
  const line = userChartLine.value;
  if (!line) return '';
  const w = chartWidth - chartPadding * 2;
  const h = chartHeight - chartPadding * 2;
  const baseY = chartPadding + h;
  const firstX = chartPadding;
  const lastX = chartPadding + w;
  return `${firstX},${baseY} ${line} ${lastX},${baseY}`;
});

const userChartYTicks = computed(() => {
  const data = userChartData.value;
  const maxVal = Math.max(...data.map(d => d.count), 10);
  const step = Math.ceil(maxVal / 4);
  return [maxVal, maxVal - step, maxVal - step * 2, maxVal - step * 3, 0];
});

// ===== 内容发布柱状图 =====
const contentChartYTicks = computed(() => {
  const data = contentChartData.value;
  const maxVal = Math.max(...data.map(d => d.count), 10);
  const step = Math.ceil(maxVal / 4);
  return [maxVal, maxVal - step, maxVal - step * 2, maxVal - step * 3, 0];
});

// ===== 收入概览 =====
const revenueSummary = computed(() => analyticsData.value.revenueSummary);

// ===== 数据 =====
const analyticsData = ref<any>({
  newUsers: 0,
  docCreated: 0,
  aiCalls: 0,
  revenue: 0,
  changes: {
    newUsers: 0,
    docCreated: 0,
    aiCalls: 0,
    revenue: 0,
  },
  revenueSummary: {
    total: 0,
    breakdown: [],
  },
});

const userChartData = ref<any[]>([]);
const contentChartData = ref<any[]>([]);
const topTemplates = ref<any[]>([]);
const revenueData = ref<any[]>([]);

function normalizeContentChart(items: any[] = []) {
  const maxCount = Math.max(...items.map((item) => item.count || 0), 1);
  return items.map((item) => ({
    ...item,
    percent: item.percent ?? Math.round(((item.count || 0) / maxCount) * 100),
  }));
}

function getHoverBarStyle(index: number, total: number) {
  const width = total > 0 ? 100 / total : 100;
  return {
    left: `${index * width}%`,
    width: `${width}%`,
  };
}

async function fetchAnalytics() {
  loading.value = true;
  try {
    const res: any = await http.get('/admin/analytics', { params: { period: period.value } });
    if (res.success && res.data) {
      analyticsData.value = res.data;
      userChartData.value = res.data.userChart || [];
      contentChartData.value = normalizeContentChart(res.data.contentChart || []);
      topTemplates.value = res.data.topTemplates || [];
      revenueData.value = res.data.revenueList || [];
    }
  } catch {
    analyticsData.value = {
      newUsers: 0,
      docCreated: 0,
      aiCalls: 0,
      revenue: 0,
      changes: { newUsers: 0, docCreated: 0, aiCalls: 0, revenue: 0 },
      revenueSummary: { total: 0, breakdown: [] },
    };
    userChartData.value = [];
    contentChartData.value = [];
    topTemplates.value = [];
    revenueData.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchAnalytics();
});
</script>

<style scoped>
/* 图表容器 */
.chart-container {
  display: flex;
  gap: 8px;
  height: 220px;
}
.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
  width: 36px;
  flex-shrink: 0;
}
.chart-y-axis span {
  font-size: 10px;
  color: rgba(0,0,0,0.3);
  text-align: right;
}
.chart-area {
  flex: 1;
  position: relative;
  min-width: 0;
}
.chart-grid-lines {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.chart-grid-line {
  height: 1px;
  background: rgba(0,0,0,0.04);
}
.chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: calc(100% - 20px);
}
.chart-x-labels {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  height: 18px;
  font-size: 9px;
  color: rgba(0,0,0,0.3);
  overflow: hidden;
}
.chart-hover-bar {
  position: absolute;
  top: 0;
  height: calc(100% - 20px);
  flex: 1;
  cursor: crosshair;
  border-right: 1px solid transparent;
  transition: background 0.15s;
}
.chart-hover-bar:hover {
  background: rgba(59, 130, 246, 0.04);
}
.chart-tooltip {
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  background: #1D1D1F;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  z-index: 10;
}
.chart-tooltip__label {
  font-size: 10px;
  opacity: 0.7;
}
.chart-tooltip__value {
  font-weight: 700;
}

/* 柱状图 */
.bar-chart {
  position: absolute;
  inset: 0;
  bottom: 20px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 0 4px;
}
.bar-chart__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  min-width: 0;
}
.bar-chart__bar {
  width: 80%;
  max-width: 24px;
  min-height: 2px;
  background: linear-gradient(180deg, #10B981 0%, #A7F3D0 100%);
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;
}
.bar-chart__label {
  font-size: 9px;
  color: rgba(0,0,0,0.3);
  margin-top: 4px;
  display: none;
}
.bar-chart__item:nth-child(1n) .bar-chart__label,
.bar-chart__item:nth-child(3n) .bar-chart__label,
.bar-chart__item:nth-child(5n) .bar-chart__label {
  display: block;
}

/* 收入概览 */
.revenue-overview__total {
  margin-bottom: 16px;
}
.revenue-overview__label {
  display: block;
  font-size: 12px;
  color: rgba(0,0,0,0.4);
  margin-bottom: 4px;
}
.revenue-overview__amount {
  font-size: 28px;
  font-weight: 800;
  color: #1D1D1F;
}
.revenue-overview__breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.revenue-overview__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.revenue-overview__bar-wrap {
  height: 6px;
  background: #F0F3F8;
  border-radius: 3px;
  overflow: hidden;
}
.revenue-overview__bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.revenue-overview__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 热门模板排行 */
.template-rank {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.template-rank__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.template-rank__item:last-child {
  border-bottom: none;
}
.template-rank__index {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #F0F3F8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(0,0,0,0.4);
  flex-shrink: 0;
}
.template-rank__index--top {
  background: #FFD60A;
  color: #1D1D1F;
}
.template-rank__info {
  flex: 1;
  min-width: 0;
}
.template-rank__name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1D1D1F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.template-rank__category {
  display: block;
  font-size: 11px;
  color: rgba(0,0,0,0.35);
}
.template-rank__usage {
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}
.template-rank__bar-wrap {
  width: 80px;
  height: 4px;
  background: #F0F3F8;
  border-radius: 2px;
  overflow: hidden;
}
.template-rank__bar {
  height: 100%;
  background: #3B82F6;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.template-rank__count {
  font-size: 11px;
  color: rgba(0,0,0,0.4);
}
</style>
