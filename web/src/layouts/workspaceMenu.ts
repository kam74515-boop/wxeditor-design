import type { Component } from 'vue';
import {
  CopyDocument,
  FolderOpened,
  PictureFilled,
  User,
} from '@element-plus/icons-vue';

export interface WorkspaceMenuItem {
  path: string;
  label: string;
  icon: Component;
}

export const workspaceMenuItems: WorkspaceMenuItem[] = [
  { path: '/projects', label: '项目管理', icon: FolderOpened },
  { path: '/templates', label: '模板中心', icon: CopyDocument },
  { path: '/materials', label: '素材库', icon: PictureFilled },
  { path: '/profile', label: '个人中心', icon: User },
];
