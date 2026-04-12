<template>
  <div class="projects-layout">
    <!-- 复用一致的左侧卡片导航 -->
    <aside class="sidebar-card">
      <div class="brand">
        <h2>团队管理</h2>
      </div>
      <nav class="nav-menu">
        <div class="nav-item text-muted" @click="$router.push('/dashboard')">
          <el-icon><FolderOpened /></el-icon> <span>全部项目</span>
        </div>
        <div class="nav-item text-muted" @click="$router.push('/templates')">
          <el-icon><CopyDocument /></el-icon> <span>模板中心</span>
        </div>
        <div class="nav-item active" @click="$router.push('/teams')">
          <el-icon><Avatar /></el-icon> <span>团队协作</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <BackButton to="/teams" label="团队列表" variant="primary" size="md" />
      </div>
    </aside>

    <!-- 右侧内容主视窗 -->
    <main class="main-card">
      <header class="page-header">
        <div class="header-left">
           <h2 class="page-title">{{ team.name || '团队名称加载中...' }}</h2>
           <span class="role-tag" v-if="team.currentUserRole">{{ team.currentUserRole === 'owner' ? '创建者' : team.currentUserRole === 'admin' ? '管理员' : '成员' }}</span>
        </div>
        <div class="header-actions">
           <!-- 暂时预留菜单区 -->
        </div>
      </header>

      <div class="list-container">
        
        <!-- 团队基本信息设置卡片 -->
        <div class="setting-card">
          <div class="card-header">
            <h3>基本信息</h3>
            <p>管理此团队的名字与目标描述</p>
          </div>
          <div class="card-body form-grid">
            <div class="input-group">
              <label>团队名称</label>
              <PaperInput :readonly="!canEdit" v-model="team.name" placeholder="请输入团队名称" />
            </div>
            <div class="input-group">
              <label>团队描述</label>
              <PaperInput :readonly="!canEdit" v-model="team.description" placeholder="请输入职责或描述" />
            </div>
          </div>
          <div class="card-footer" v-if="canEdit">
             <button class="save-btn" @click="saveTeam">保存修改</button>
          </div>
        </div>

        <!-- 成员列表卡片 -->
        <div class="setting-card mt-24">
          <div class="card-header">
            <h3>团队成员 ({{ team.members.length || 0 }})</h3>
            <p>加入该团队参与协作编辑的成员名单</p>
          </div>
          <div class="card-body">
            <ul class="member-list" v-if="team.members.length > 0">
              <li v-for="m in team.members" :key="m.id" class="member-item">
                <div class="avatar">{{ initials(m.name) }}</div>
                <div class="info">
                  <div class="name">{{ m.name }}</div>
                  <div class="role-desc">角色: {{ m.role || 'Member' }}</div>
                </div>
              </li>
            </ul>
            <div v-else class="empty-hint">暂无成员加入</div>
          </div>
        </div>

        <!-- 发送邀请卡片 -->
        <div class="setting-card mt-24" v-if="canEdit">
          <div class="card-header">
            <h3>邀请新成员</h3>
            <p>输入邮箱地址并赋予角色权限即可对外界发出协作邀请</p>
          </div>
          <div class="card-body">
            <div class="invite-form">
              <div class="input-wrapper email-input">
                <PaperInput v-model="inviteEmail" placeholder="输入受邀人邮箱地址" />
              </div>
              <div class="input-wrapper role-select-wrapper">
                <select v-model="inviteRole" class="role-select" :disabled="!canEdit">
                  <option value="member">普通成员 (Member)</option>
                  <option value="admin">管理员 (Admin)</option>
                </select>
              </div>
              <button class="invite-btn" :disabled="!canEdit || !inviteEmail" @click="inviteMember">发送邀请</button>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FolderOpened, CopyDocument, Avatar, Back } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PaperInput from '@/components/base/PaperInput.vue';
import BackButton from '@/components/navigation/BackButton.vue';
import http from '@/utils/http';

const route = useRoute();
const router = useRouter();

const team = ref({ id: '', name: '', description: '', members: [] as any[], currentUserRole: '' });
const inviteEmail = ref('');
const inviteRole = ref('member');

const canEdit = computed(() => {
  const role = team.value.currentUserRole || 'member';
  return role === 'owner' || role === 'admin';
});

onMounted(() => {
  fetchTeam();
});

function initials(name: string) {
  if (!name) return 'U';
  return name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
}

async function fetchTeam() {
  const id = route.params.id;
  try {
    const res = await http.get<any>(`/teams/${id}`);
    if (res.success || res) {
      team.value = res.data || res; // 兼容旧接口
    }
  } catch(e) {
    console.warn('获取详情失败', e);
  }
}

async function saveTeam() {
  const id = team.value.id;
  try {
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: team.value.name, description: team.value.description })
    });
    if (res.ok) {
      ElMessage.success('保存成功');
      fetchTeam();
    }
  } catch(e) {
    ElMessage.error('通讯失败');
  }
}

async function inviteMember() {
  if (!inviteEmail.value) return;
  const id = team.value.id;
  const payload = { email: inviteEmail.value, role: inviteRole.value };
  try {
    const res = await fetch(`/api/teams/${id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      inviteEmail.value = '';
      inviteRole.value = 'member';
      ElMessage.success('邀请已发送');
      fetchTeam();
    } else {
      ElMessage.error('无法发送邀请');
    }
  } catch (e) {
    ElMessage.error('接口故障');
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.projects-layout {
  display: flex; height: calc(100vh - $nav-offset); width: 100%; background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: 14px; gap: 12px; box-sizing: border-box; overflow: hidden;
}

/* 左侧导览 */
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

/* 右侧主视窗 */
.main-card {
  flex: 1; background-color: #ffffff; border-radius: 12px; padding: 24px 32px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: $space-xl;
    .header-left {
      display: flex; align-items: center; gap: 12px;
      .page-title { font-size: 1.25rem; font-weight: 800; color: $layout-sider-dark; margin: 0; }
      .role-tag { padding: 4px 10px; background: #FFD60A; color: $layout-sider-dark; font-size: 0.75rem; font-weight: 800; border-radius: 6px; }
    }
  }

  .list-container {
    flex: 1; overflow-y: auto; padding-bottom: 40px;
    
    .mt-24 { margin-top: 24px; }

    .setting-card {
      background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; overflow: hidden;
      
      .card-header {
        padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.04); background: #fbfbfd;
        h3 { font-size: 1.05rem; font-weight: 700; color: $layout-sider-dark; margin: 0 0 6px 0; }
        p { font-size: 0.85rem; color: rgba(0,0,0,0.5); margin: 0; }
      }
      
      .card-body {
        padding: 24px;
      }
      
      .card-footer {
        padding: 16px 24px; border-top: 1px solid rgba(0,0,0,0.04); background: #fbfbfd; display: flex; justify-content: flex-end;
        .save-btn { padding: 8px 20px; background: $layout-sider-dark; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); } }
      }
    }
    
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
      .input-group {
        display: flex; flex-direction: column; gap: 8px;
        label { font-size: 0.9rem; font-weight: 600; color: $layout-sider-dark; }
        :deep(.paper-input-wrapper) { margin: 0; }
      }
    }

    .member-list {
      list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;
      .member-item {
        display: flex; align-items: center; padding: 12px 16px; border-radius: 8px; background: #fff; border: 1px solid rgba(0,0,0,0.06); transition: all 0.2s;
        &:hover { border-color: rgba(0,0,0,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .avatar { width: 42px; height: 42px; border-radius: 50%; background: $brand-yellow; display:flex; align-items:center; justify-content:center; color:$layout-sider-dark; font-weight:800; font-size: 1rem; margin-right: 12px; }
        .info { flex: 1; overflow: hidden; .name { font-weight: 700; color: $layout-sider-dark; font-size: 0.95rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .role-desc { font-size: 0.8rem; color: rgba(0,0,0,0.5); } }
      }
    }
    .empty-hint { font-size: 0.9rem; color: rgba(0,0,0,0.4); font-style: italic; }

    .invite-form {
      display: flex; gap: 16px; align-items: center;
      .input-wrapper {
        :deep(.paper-input-wrapper) { margin: 0; }
        &.email-input { flex: 2; min-width: 240px; }
        &.role-select-wrapper { flex: 1; min-width: 140px; }
      }
      .role-select { width: 100%; height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.15); font-size: 0.9rem; outline: none; background: #fff; color: $layout-sider-dark; }
      .invite-btn { height: 44px; padding: 0 24px; background: #FFD60A; color: $layout-sider-dark; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; transition: all 0.2s; &:disabled { opacity: 0.5; cursor: not-allowed; } &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255, 214, 10, 0.3); } }
    }
  }
}
</style>
