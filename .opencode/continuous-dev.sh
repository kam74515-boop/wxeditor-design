#!/bin/bash
# wxeditor-design continuous development loop
# Runs OpenCode tasks sequentially, commits & pushes after each

set -e
PROJECT="/root/wxeditor-design"
LOG="/root/wxeditor-design/.opencode/continuous-dev.log"
mkdir -p "$(dirname "$LOG")"

cd "$PROJECT"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

# Task list - will be executed in order
TASKS=(
    "为 server-v2 的 auth.service.js 编写完整的单元测试，使用 jest，测试 login/register/changePassword/refreshToken 等方法。测试文件放在 server-v2/tests/unit/auth.service.test.js"
    "为 server-v2 的 content.service.js 编写完整的单元测试，使用 jest mock，测试 CRUD 操作。测试文件放在 server-v2/tests/unit/content.service.test.js"
    "为 server-v2 的 template.service.js 编写完整的单元测试。测试文件放在 server-v2/tests/unit/template.service.test.js"
    "为 server-v2 的 material.service.js 编写完整的单元测试，注意修复已知的 db import bug。测试文件放在 server-v2/tests/unit/material.service.test.js"
    "为 server-v2 的 membership.service.js 和 team.service.js 编写完整的单元测试。测试文件放在 server-v2/tests/unit/"
    "为 server-v2 的 scheduledPost.service.js 和 articleBatch.service.js 编写完整的单元测试"
    "为 server-v2 的 comment.service.js 和 wechatAccount.service.js 编写完整的单元测试"
    "为 server-v2 的 ai.service.js 和 aiAgent.service.js 编写完整的单元测试"
    "为 server-v2 的 draft.service.js 和 collab.service.js 编写完整的单元测试"
    "优化前端 bundle，对 element-plus 做 tree-shaking 和 code-split，用 vite 的 manualChunks 配置拆分第三方库"
    "添加 Vue Router 的 lazy loading，所有路由组件改为 () => import() 动态导入"
    "添加 i18n 国际化支持，安装 vue-i18n，创建中英文语言包，配置切换"
    "实现微信 OAuth 2.0 真实 API 对接：后端 wechat.ctrl.js 中实现真实的 /api/wechat/auth/callback 路由"
    "添加 API 请求重试机制和统一的错误处理中间件"
    "为前端添加 Service Worker 支持 PWA 离线访问"
)

log "=== Continuous Development Loop Started ==="
log "Total tasks: ${#TASKS[@]}"

for i in "${!TASKS[@]}"; do
    TASK_NUM=$((i + 1))
    TASK="${TASKS[$i]}"
    
    log "--- Task $TASK_NUM/${#TASKS[@]}: ${TASK:0:80}... ---"
    
    # Run OpenCode with the task
    if opencode run "$TASK" 2>&1 | tee -a "$LOG"; then
        log "Task $TASK_NUM completed successfully"
    else
        log "Task $TASK_NUM had issues (continuing)"
    fi
    
    # Security scan before commit
    log "Running security scan..."
    SECRETS=$(grep -rn --include="*.js" --include="*.ts" --include="*.vue" --include="*.json" \
        -iE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})" \
        "$PROJECT/web/src/" "$PROJECT/server-v2/src/" 2>/dev/null | grep -v node_modules || true)
    
    if [ -n "$SECRETS" ]; then
        log "WARNING: Secrets detected! Skipping push:"
        echo "$SECRETS" | tee -a "$LOG"
        continue
    fi
    
    # Build verification
    log "Running build verification..."
    cd "$PROJECT/web"
    if npx vite build 2>&1 | tail -5 | tee -a "$LOG"; then
        log "Build OK"
    else
        log "Build FAILED - skipping push"
        cd "$PROJECT"
        continue
    fi
    cd "$PROJECT"
    
    # Git commit and push
    CHANGES=$(git status --short | grep -v node_modules | grep -v dist)
    if [ -n "$CHANGES" ]; then
        log "Committing and pushing changes..."
        git add -A
        git commit -m "feat: task $TASK_NUM - automated development" --allow-empty 2>&1 | tee -a "$LOG" || true
        git push origin main 2>&1 | tee -a "$LOG" || true
        log "Pushed to GitHub"
    else
        log "No changes to commit"
    fi
    
    # Small delay between tasks
    sleep 5
done

log "=== All tasks completed ==="
