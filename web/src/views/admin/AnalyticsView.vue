<template>
  <!-- 管理后台 — 数据统计 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">数据统计</h1>
      <div style="display: flex; gap: 8px;">
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': period === '7d' }]" @click="period = '7d'">最近7天</button>
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': period === '30d' }]" @click="period = '30d'">最近30天</button>
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': period === '90d' }]" @click="period = '90d'">最近90天</button>
      </div>
    </div>
    <p class="admin-main__desc">用量趋势、收入报表与用户增长数据。</p>

    <!-- 关键指标 -->
    <div class="stats-row" style="margin-bottom: 28px;">
      <div class="stat-card">
        <span class="stat-card__label">新增用户</span>
        <span class="stat-card__value">247</span>
        <span class="stat-card__change stat-card__change--up">↑ 15.3%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">文档创建</span>
        <span class="stat-card__value">1,832</span>
        <span class="stat-card__change stat-card__change--up">↑ 22.1%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">AI 调用次数</span>
        <span class="stat-card__value">8,456</span>
        <span class="stat-card__change stat-card__change--up">↑ 41.7%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">收入 (元)</span>
        <span class="stat-card__value">¥54,200</span>
        <span class="stat-card__change stat-card__change--up">↑ 28.4%</span>
      </div>
    </div>

    <!-- 用量趋势占位 -->
    <div class="card" style="height: 320px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
      <div style="text-align: center; color: rgba(0,0,0,0.3);">
        <TrendingUp :size="48" style="margin-bottom: 12px;" />
        <p style="font-size: 14px;">图表组件集成后将在此显示用量趋势</p>
        <p style="font-size: 12px; margin-top: 4px;">推荐: ECharts / Chart.js</p>
      </div>
    </div>

    <!-- 收入明细 -->
    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">收入明细</h3>
    <table class="admin-table">
      <thead><tr><th>日期</th><th>订单数</th><th>金额</th><th>环比</th></tr></thead>
      <tbody>
        <tr v-for="row in revenueData" :key="row.date">
          <td>{{ row.date }}</td>
          <td>{{ row.orders }}</td>
          <td style="font-weight: 700;">¥{{ row.amount }}</td>
          <td><span :class="row.change >= 0 ? 'stat-card__change--up' : 'stat-card__change--down'" style="font-weight: 600; font-size: 13px;">{{ row.change >= 0 ? '↑' : '↓' }} {{ Math.abs(row.change) }}%</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TrendingUp } from 'lucide-vue-next';
const period = ref('7d');
const revenueData = [
  { date: '2026-03-15', orders: 18, amount: '2,610', change: 12.3 },
  { date: '2026-03-14', orders: 14, amount: '1,890', change: -5.2 },
  { date: '2026-03-13', orders: 22, amount: '3,420', change: 28.7 },
  { date: '2026-03-12', orders: 16, amount: '2,240', change: 8.1 },
  { date: '2026-03-11', orders: 11, amount: '1,540', change: -11.4 },
];
</script>
