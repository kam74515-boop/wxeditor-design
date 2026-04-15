<template>
  <div class="projects-layout">
    <!-- 复用一致的左侧卡片导航 -->
    <aside class="sidebar-card">
      <div class="brand">
        <h2>团队管理</h2>
      </div>
      <nav class="nav-menu">
        <div class="nav-item">
          <el-icon><FolderOpened /></el-icon> <span @click="$router.push('/projects')">全部项目</span>
        </div>
        <div class="nav-item">
          <el-icon><CopyDocument /></el-icon> <span @click="$router.push('/templates')">模板中心</span>
        </div>
        <div class="nav-item active">
          <el-icon><Avatar /></el-icon> <span>团队协作</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="showCreate = !showCreate">
          <el-icon><Plus /></el-icon> <span>创建新团队</span>
        </button>
      </div>
    </aside>

    <!-- 右侧内容主视窗 -->
    <main class="main-card">
      <header class="page-header">
        <h2 class="page-title">全部团队</h2>
        <div class="header-actions">
           <button class="action-btn text-btn" @click="$router.push('/invitations')">
             <el-icon><Bell /></el-icon> <span>查看我的邀请</span>
           </button>
        </div>
      </header>

      <div class="list-container">
        <!-- 卡片式的新增团队折叠面板 -->
        <transition name="slide-down">
          <div class="create-panel" v-if="showCreate">
            <div class="panel-header">
              <h3>组建新团队</h3>
              <p>邀请成员参与微信公众号推文的共同排版与审核。</p>
            </div>
            <div class="panel-form">
               <div class="input-wrapper">
                 <PaperInput v-model="newTeam.name" placeholder="请输入团队标识（必填）" />
               </div>
               <div class="input-wrapper flex-auto">
                 <PaperInput v-model="newTeam.description" placeholder="一句话描述团队作用 (可选)" />
               </div>
               <button class="submit-btn" :disabled="!newTeam.name" @click="createTeam">提交创建</button>
            </div>
          </div>
        </transition>

        <div v-if="teams.length === 0" class="empty-state">
           <el-icon><User /></el-icon>
           <p>你暂时还没有加入任何协同团队</p>
        </div>

        <div v-else class="teams-grid">
           <!-- 每个团队都被包裹在干净的边框白卡里 -->
           <div v-for="team in teams" :key="team.id" class="team-card" @click="goToTeam(team)">
             <div class="card-icon">
               <span class="initial">{{ getInitials(team.name) }}</span>
             </div>
             <div class="card-body">
               <h3 class="team-name">{{ team.name }}</h3>
               <p class="role-desc">你在此团队的角色: <strong>{{ team.currentUserRole || 'Member' }}</strong></p>
               
               <div class="team-meta">
                 <div class="member-badge">
                   <el-icon><Avatar /></el-icon>
                   {{ (team.members && team.members.length) || 0 }} 成员
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FolderOpened, CopyDocument, Avatar, Plus, Bell, User } from '@element-plus/icons-vue';
import PaperInput from '@/components/base/PaperInput.vue';

const router = useRouter();

const teams = ref<any[]>([]);
const showCreate = ref(false);
const newTeam = ref({ name: '', description: '' });

onMounted(() => {
  fetchTeams();
});

async function fetchTeams() {
  try {
    const res = await fetch('/api/teams');
    if (!res.ok) throw new Error('Failed to fetch teams');
    const data = await res.json();
    teams.value = data;
  } catch (e) {
    console.error(e);
  }
}

async function createTeam() {
  if (!newTeam.value.name.trim()) return;
  try {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeam.value.name, description: newTeam.value.description })
    });
    if (!res.ok) throw new Error('Failed to create team');
    const created = await res.json();
    newTeam.value.name = '';
    newTeam.value.description = '';
    showCreate.value = false;
    if (created) {
      teams.value.unshift(created);
    }
  } catch (e) {
    console.error(e);
  }
}

function goToTeam(team: any) {
  if (team && team.id) {
    router.push({ path: `/teams/${team.id}` });
  }
}

function getInitials(name: string) {
  if (!name) return 'T';
  return name.charAt(0).toUpperCase();
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.projects-layout {
  display: flex;
  height: calc(100vh - $nav-offset);
  width: 100%;
  background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: $block-gap $page-padding $page-padding;
  gap: $block-gap;
  box-sizing: border-box;
  overflow: hidden;
}

/* 左侧导览（沿用统一风格） */
.sidebar-card {
  width: 280px;
  background: $brand-yellow;
  border-radius: $block-radius-lg;
  display: flex;
  flex-direction: column;
  padding: $space-lg;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  
  .brand {
    margin-bottom: $space-xl;
    h2 { font-size: 1.1rem; font-weight: 800; color: $layout-sider-dark; margin: 0; }
  }

  .nav-menu {
    flex: 1; display: flex; flex-direction: column; gap: 8px;

    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px;
      font-size: 0.95rem; font-weight: 600; color: $layout-sider-dark; cursor: pointer; transition: all $transition-fast;

      &:hover { background-color: rgba(255,255,255,0.4); }
      &.active { background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
      &.text-muted { color: rgba(0,0,0,0.5); }
    }
  }

  .sidebar-bottom {
    margin-top: auto;
    
    .new-project-btn {
      width: 100%; padding: 12px 16px; border-radius: 999px; border: 1px solid rgba(0, 0, 0, 0.1);
      background-color: #ffffff; color: $layout-sider-dark; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all $transition-fast;
      
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    }
  }
}

/* 右侧主视窗 */
.main-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: $block-radius-lg;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-xl;
    
    .page-title { font-size: 1.25rem; font-weight: 800; color: $layout-sider-dark; margin: 0; }
    
    .header-actions {
      .action-btn {
        display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px;
        font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all $transition-fast;
        
        &.text-btn { background: #f6f7f8; border: 1px solid transparent; color: $layout-sider-dark; &:hover { background: #e5e7eb; } }
      }
    }
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 40px;
    
    /* 创建面板 */
    .create-panel {
      background: #fbfbfd;
      border: 1px dashed rgba(0,0,0,0.1);
      border-radius: $block-radius-lg;
      padding: 20px;
      margin-bottom: 24px;
      
      .panel-header {
        margin-bottom: 16px;
        h3 { font-size: 1rem; margin: 0 0 4px 0; color: $layout-sider-dark; }
        p { font-size: 0.85rem; color: rgba(0,0,0,0.5); margin: 0; }
      }
      
      .panel-form {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        
        .input-wrapper {
          flex: 1;
          &.flex-auto { flex: 2; }
          :deep(.paper-input-wrapper) { margin: 0; }
        }
        
        .submit-btn {
          height: 44px; padding: 0 24px; background: $layout-sider-dark; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
          &:disabled { opacity: 0.5; cursor: not-allowed; }
          &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        }
      }
    }
    
    .slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
    .slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }

    .empty-state {
      height: 60%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(0,0,0,0.3);
      .el-icon { font-size: 48px; margin-bottom: 16px; }
      p { font-weight: 600; }
    }
    
    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      
      .team-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: $block-radius-lg;
        padding: 20px;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.05); border-color: transparent; }
        
        .card-icon {
          width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, $brand-yellow 0%, #FFD60A 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          .initial { font-size: 1.5rem; font-weight: 800; color: $layout-sider-dark; }
        }
        
        .card-body {
          flex: 1; overflow: hidden;
          .team-name { font-size: 1.05rem; font-weight: 700; color: $layout-sider-dark; margin: 0 0 6px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .role-desc { font-size: 0.8rem; color: rgba(0,0,0,0.5); margin: 0 0 12px 0; strong { color: $layout-sider-dark; } }
          
          .team-meta {
            display: flex; align-items: center;
            .member-badge {
              display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f6f7f8; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: rgba(0,0,0,0.6);
            }
          }
        }
      }
    }
  }
}

/* ===== 响应式适配 ===== */
@media (max-width: 1024px) {
  .sidebar-card { width: 200px; padding: 16px; }
  .main-card .list-container .teams-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .sidebar-card { display: none; }
  .main-card {
    padding: 16px;
    .list-container {
      .create-panel .panel-form {
        flex-direction: column;
        .submit-btn { width: 100%; }
      }
      .teams-grid {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>
