<template>
  <div class="projects-layout">
    <aside class="sidebar-card">
      <div class="brand">
        <h2>团队管理</h2>
      </div>
      <nav class="nav-menu">
        <div class="nav-item text-muted" @click="$router.push('/dashboard')">
          <el-icon><FolderOpened /></el-icon> <span>全部项目</span>
        </div>
        <div class="nav-item active" @click="$router.push('/teams')">
          <el-icon><Avatar /></el-icon> <span>团队协作</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="$router.push('/teams')">
          <el-icon><Back /></el-icon> <span>返回团队列表</span>
        </button>
      </div>
    </aside>

    <main class="main-card">
      <header class="page-header">
        <h2 class="page-title">收到的邀请 ({{ invitations.length }})</h2>
      </header>

      <div class="list-container">
        <div v-if="invitations.length === 0" class="empty-state">
           <el-icon><Bell /></el-icon>
           <p>你的收件箱很干净，暂无未处理的团队邀请</p>
        </div>

        <div v-else class="invitations-grid">
           <div class="invite-card" v-for="inv in invitations" :key="inv.id">
              <div class="card-icon">
                <el-icon><Message /></el-icon>
              </div>
              <div class="card-body">
                <h3 class="team-name">{{ inv.teamName || inv.team?.name || '未知团队' }}</h3>
                <p class="role-desc">邀请你以 <strong>{{ inv.role || 'Member' }}</strong> 身份加入</p>
              </div>
              <div class="card-actions">
                <button class="action-btn accept" @click="respond(inv.id, 'accept')">同意加入</button>
                <button class="action-btn decline" @click="respond(inv.id, 'decline')">忽略</button>
              </div>
           </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FolderOpened, Avatar, Back, Bell, Message } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const invitations = ref<any[]>([]);

onMounted(() => {
  fetchInvitations();
});

async function fetchInvitations() {
  try {
    const res = await fetch('/api/invitations');
    if (res.ok) {
      invitations.value = await res.json();
    }
  } catch (e) {
    console.error(e);
  }
}

async function respond(invId: string, action: string) {
  try {
    const res = await fetch(`/api/invitations/${invId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      ElMessage.success(action === 'accept' ? '已成功加入团队' : '已忽略该邀请');
      invitations.value = invitations.value.filter(i => i.id !== invId);
    }
  } catch (e) {
    ElMessage.error('服务器通讯异常');
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.projects-layout {
  display: flex; height: calc(100vh - $nav-offset); width: 100%; background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: 14px; gap: 12px; box-sizing: border-box; overflow: hidden;
}

.sidebar-card {
  width: 280px; background: $brand-yellow; border-radius: 12px; display: flex; flex-direction: column; padding: $space-lg; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  .brand { margin-bottom: $space-xl; h2 { font-size: 1.1rem; font-weight: 800; color: $layout-sider-dark; margin: 0; } }
  .nav-menu {
    flex: 1; display: flex; flex-direction: column; gap: 8px;
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; color: $layout-sider-dark; cursor: pointer; transition: all $transition-fast;
      &:hover { background-color: rgba(255,255,255,0.4); }
      &.active { background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
      &.text-muted { color: rgba(0,0,0,0.5); }
    }
  }
  .sidebar-bottom {
    margin-top: auto;
    .new-project-btn {
      width: 100%; padding: 12px 16px; border-radius: 999px; border: 1px solid rgba(0, 0, 0, 0.1); background-color: #ffffff; color: $layout-sider-dark; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all $transition-fast;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    }
  }
}

.main-card {
  flex: 1; background-color: #ffffff; border-radius: 12px; padding: 24px 32px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header { display: flex; align-items: center; margin-bottom: $space-xl; .page-title { font-size: 1.25rem; font-weight: 800; color: $layout-sider-dark; margin: 0; } }

  .list-container {
    flex: 1; overflow-y: auto;
    .empty-state {
      height: 60%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(0,0,0,0.3);
      .el-icon { font-size: 48px; margin-bottom: 16px; } p { font-weight: 600; }
    }

    .invitations-grid {
      display: flex; flex-direction: column; gap: 16px; max-width: 800px;
      
      .invite-card {
        background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; transition: all 0.2s;
        &:hover { border-color: transparent; box-shadow: 0 8px 16px rgba(0,0,0,0.04); transform: translateY(-2px); }
        
        .card-icon { width: 44px; height: 44px; border-radius: 50%; background: #fbfbfd; border: 1px solid rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; color: $brand-yellow; font-size: 20px; flex-shrink: 0; }
        
        .card-body {
          flex: 1; overflow: hidden;
          .team-name { font-size: 1.05rem; font-weight: 700; color: $layout-sider-dark; margin: 0 0 4px 0; }
          .role-desc { font-size: 0.85rem; color: rgba(0,0,0,0.5); margin: 0; strong { color: $layout-sider-dark; } }
        }
        
        .card-actions {
          display: flex; gap: 12px; align-items: center;
          .action-btn {
            height: 36px; padding: 0 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none;
            &.accept { background: #10b981; color: #fff; &:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); } }
            &.decline { background: #f3f4f6; color: rgba(0,0,0,0.6); &:hover { background: #e5e7eb; color: $layout-sider-dark; } }
          }
        }
      }
    }
  }
}
</style>
