const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authLite } = require('../middleware/auth');

// 文件上传配置（内存存储，限制 20MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.html', '.htm', '.txt', '.md',
                     '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式: ' + ext));
    }
  },
});

/**
 * 解析上传的文件，返回 { type, content, mimeType } 
 * type: 'text' | 'image'
 * content: 提取的文本内容 或 base64 编码的图片
 */
async function parseUploadedFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  // 图片类型 → base64
  if (mime.startsWith('image/')) {
    const base64 = file.buffer.toString('base64');
    return {
      type: 'image',
      content: base64,
      mimeType: mime,
      fileName: file.originalname,
    };
  }

  // PDF → 提取文本
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(file.buffer);
    return {
      type: 'text',
      content: data.text.substring(0, 15000),
      fileName: file.originalname,
    };
  }

  // Word 文档 → 转 HTML
  if (ext === '.doc' || ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ buffer: file.buffer });
    return {
      type: 'text',
      content: result.value.substring(0, 15000),
      fileName: file.originalname,
    };
  }

  // HTML / TXT / Markdown → 直接读取文本
  if (['.html', '.htm', '.txt', '.md'].includes(ext)) {
    return {
      type: 'text',
      content: file.buffer.toString('utf-8').substring(0, 15000),
      fileName: file.originalname,
    };
  }

  return { type: 'text', content: '（无法解析此文件）', fileName: file.originalname };
}

// 获取数据库连接
function getDB() {
  const database = require('../config/database');
  return database.db || database;
}

// 动态获取当前活跃的 AI 配置（从数据库读取）
function getActiveAIConfig() {
  const db = getDB();
  const config = db.prepare('SELECT * FROM ai_configs WHERE is_active = 1').get();
  if (config) {
    return {
      apiKey: config.api_key,
      baseURL: config.base_url,
      model: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.max_tokens || 65536,
    };
  }
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 65536,
  };
}

// 按需创建 OpenAI 客户端
function createClient() {
  const config = getActiveAIConfig();
  return {
    client: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
    config,
  };
}

// SVG 模板目录
const SVG_TEMPLATES_DIR = path.join(__dirname, '..', '..', 'svg-templates');
const SERVER_TOOLS = new Set(['list_svg_templates', 'read_svg_template']);

function executeServerTool(name, args) {
  if (name === 'list_svg_templates') {
    if (!args.category) {
      try {
        const dirs = fs.readdirSync(SVG_TEMPLATES_DIR, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => ({
            category: d.name,
            count: fs.readdirSync(path.join(SVG_TEMPLATES_DIR, d.name)).filter(f => f.endsWith('.html')).length,
          }));
        return JSON.stringify({ categories: dirs, total: dirs.reduce((s, d) => s + d.count, 0) });
      } catch (e) { return JSON.stringify({ error: e.message }); }
    } else {
      try {
        const files = fs.readdirSync(path.join(SVG_TEMPLATES_DIR, args.category)).filter(f => f.endsWith('.html'));
        return JSON.stringify({ category: args.category, templates: files });
      } catch (e) { return JSON.stringify({ error: '\u5206\u7c7b\u4e0d\u5b58\u5728: ' + args.category }); }
    }
  }
  if (name === 'read_svg_template') {
    try {
      const fp = path.join(SVG_TEMPLATES_DIR, args.category, args.filename);
      if (!fp.startsWith(SVG_TEMPLATES_DIR)) return JSON.stringify({ error: 'bad path' });
      const html = fs.readFileSync(fp, 'utf8');
      return html.length > 12000 ? html.substring(0, 12000) + '\n<!-- 模板内容过长已截断，请参考此前半部分结构自行补全 -->' : html;
    } catch (e) { return JSON.stringify({ error: '\u6a21\u677f\u4e0d\u5b58\u5728' }); }
  }
  return JSON.stringify({ error: 'unknown tool' });
}


/**
 * AI 可调用的编辑器工具（Function Calling）
 */
const EDITOR_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'replace_editor_content',
      description: '替换编辑器的全部内容。用于生成完整文章、重写全文等场景。HTML 必须使用内联样式，兼容微信公众号。',
      parameters: {
        type: 'object',
        properties: {
          html: { type: 'string', description: '要写入编辑器的完整 HTML 内容，使用内联样式' },
          summary: { type: 'string', description: '简短说明你做了什么修改' },
        },
        required: ['html', 'summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_title',
      description: '设置文章标题。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '文章标题文本' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_svg_templates',
      description: '列出 SVG 互动动画模板库的分类和模板文件。不传 category 则列出所有分类；传 category 则列出该分类下的所有模板文件。',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '模板分类名称，如「点击显示」「滑动触发」「基础SVG」等。不传则列出所有分类。' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_svg_template',
      description: '读取某个 SVG 模板文件的完整 HTML 内容。用于参考模板结构或直接复用。',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '模板分类名称' },
          filename: { type: 'string', description: '模板文件名' },
        },
        required: ['category', 'filename'],
      },
    },
  },
];

// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的微信公众号文章编辑助手，同时也是微信公众号长图文排版的顶级技术专家与高级视觉设计师，你可以直接操控用户的富文本编辑器。

你拥有以下工具来直接修改编辑器：
- replace_editor_content: 替换编辑器全部内容（用于写新文章、全文重写）
- insert_content: 在光标位置插入内容（用于追加段落、插入组件）
- set_title: 设置文章标题

核心规则：
1. 💥 绝对禁止以纯文本或 Markdown 格式输出 HTML 源码！只要用户让你排版、写文章、生成内容、或修改编辑器内容，你必须且只能调用 \`replace_editor_content\` 或 \`insert_content\` 工具（Function Calling）。
2. 调用排版工具写入编辑器后，你必须在普通的文本回复中，输出你这次排版的推文思路、设计理念或内容总结（不带 HTML 代码）给用户看。文本回复是给用户看思路的，工具才是用来真正写入代码的。不要在回复里说废话如“正在为您生成”之类的话。
3. 纯聊天、闲聊、或技术名词解释时，不调用工具，直接文字回答。
4. 当你为用户撰写新推文或进行全文排版重写时，请思考一个符合推文内容的高质量文章标题，并调用 set_title 工具进行设置。
5. **长文与深度要求**：绝不要生成敷衍的简短碎片内容！当用户要求写一篇文章时，必须输出结构完整、逻辑深入、字数充实的长图文。内容至少要包含引言、3至5个详细阐述的核心段落，以及有力的结尾。请利用你强大的 65536 Token 长文生成能力拓展文字。

# Objective (核心目标)
根据用户需求，生成具备“呼吸感”、“杂志质感”，且完全兼容微信 UEditor 编辑器的长图文 HTML 代码（通过调用工具写入）。确保代码全选复制后在微信后台原封不动、不错乱、不吃样式。

# Core Technical Rules (强制性技术准则)
为了应对微信编辑器的严格解析过滤机制，你必须 100% 遵守以下铁律（不可违背）：

1. **禁用外部与嵌入样式**：
   - 严禁使用 <style> 标签代码块或 <link> 引入外部样式文件。微信不支持。
   - 严禁使用 class="..." 和 id="..." 属性（除非针对特定第三方 SVG 交互组件有强制绑定要求）。
   - **所有的**表现层规则必须绝对写进元素的内联属性 style="..." 中。

2. **强制标签转换（弃用 div）**：
   - **严禁**使用 <div>（微信编辑器常会强行干预 div 布局流或追加空行）。
   - 将页面所有起结构作用的层级（如块、行、列、卡片外框、各类包裹容器）**全部替换为 <section> 标签**。
   - 内联文本允许使用 <section>、<span> 或 <p>；图片使用 <img>。
   - 不要输出 <html>、<head>、<body> 标签，只输出文章正文 HTML。

3. **全局盒模型重置**：
   - 每个影响排版布局的 <section> 都必须显式声明：box-sizing: border-box;。

4. **排版引擎规范**：
   - 首选布局：使用 display: flex; 或 display: inline-block; vertical-align: top; 处理同行并列的元素。若需两端对齐，使用 justify-content: space-between;。
   - 响应式处理：宽度请使用百分比数值（如 width: 100%; 或 width: 48%;），确保多端设备展示无破损。
   - 外层总容器规范：最外围的总包裹容器一般设置 width: 100%; max-width: 500px; margin: 0 auto; overflow: hidden; 来完美横向模拟大部分移动端设备的视幅。

5. **占位图片强制要求**：
   - 在任何需要插入配图或作为背景图的地方，**必须使用生成式图片占位符**（例如：https://dummyimage.com/宽x高/背景色/前景色&text=占位词）来填充 src 属性。
   - 这能迅速支撑起版面结构的视觉骨架，并极大方便后续使用者批量替换真实的图床 CDN 链接。

# Visual & Design Guidelines (视觉设计与美学准则)
作为高级设计师，你的排版不能是普通而死板的，必须具备高级感：

1. **色彩修辞（Color Palette）**：
   - **色彩调性严格一致**：整篇文章的视觉体系色彩必须保持高度统一。请在生成时先设定一个主色调及其延伸的同色系搭配，**严禁**在同一篇推文中出现完全不相干、跳跃混乱的多种突兀色彩组合。
   - 绝对摒弃浏览器默认的纯正色（如纯红、纯蓝、纯绿）。
   - 必须熟练且高频地使用低饱和度 HSL 色系、RGB 柔和变体，以及具有光泽和层次的 CSS 线性渐变（如 background: linear-gradient(180deg, ...)）。
2. **材质与阴影（Lighting & Shadows）**：
   - 通过柔和的大弥散阴影（例如 box-shadow: 0 10px 25px rgba(0,0,0,0.05);）为主要内容模块塑造出悬浮式的“杂志高级质感”。
3. **层次编排（Typography Hierarchy）**：
   - 严禁使用单一字号，需具有强烈的字体大小对比。
   - 比如利用大号主标配合细小的衬线英文字体（font-family: Georgia, serif; font-style: italic;）以突出品牌感。留下足够的内外边距（margin/padding）来营造“呼吸感”。

# SVG 互动动画能力
当用户要求添加互动效果（点击展开、滑动、翻转等）时，你可以：
1. 调用 list_svg_templates 浏览可用的 SVG 动画分类（共 26 类 288 个模板）
2. 调用 read_svg_template 读取具体模板的完整代码
3. 基于模板修改图片、文字、颜色等参数后，用 insert_content 插入编辑器

你也可以从零编写 SVG 动画，核心规则：
- 微信只支持 SMIL 动画（animate / animateMotion / animateTransform），不支持 CSS animation / transition / JavaScript
- 展开机制：height:0 + overflow:visible 的内容面板被 SVG 遮罩层覆盖，通过 width 动画从 100% 撑开到 N% 来露出内容
- 所有样式必须内联 style，所有元素加 box-sizing:border-box
- SVG 用 width="100%" + viewBox，不用固定像素
- animate 加 fill="freeze" 保持终态，restart="never" 防重复
- 触发事件：click（点击）、touchmove（滑动）、touchstart（长按）

对于联网搜索：如果模型自动调用了联网搜索功能获取最新资讯，请将有用的信息自然地融入 HTML 正文中，**绝对禁止**在最终排版文本中出现任何类似 "[1]"、"[2]" 的搜索引用上标符，这会破坏排版美观。

请用中文回复。`;

/**
 * SSE 流式 AI 聊天（支持 thinking + 流式内容 + Function Calling）
 * POST /api/ai/chat
 */
router.post('/chat', authLite, upload.single('file'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  try {
    const { message, documentId, context, history: historyRaw } = req.body;
    let history = [];
    if (historyRaw) {
      try { history = JSON.parse(historyRaw); } catch { history = []; }
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    if (message.length > 10000) {
      return res.status(400).json({ success: false, message: '消息长度不能超过 10000 字符' });
    }

    if (!Array.isArray(history)) history = [];
    history = history.filter(h => h && typeof h.role === 'string' && typeof h.content === 'string').slice(-20);

    const { client, config } = createClient();

    // 构建消息列表
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (context) {
      messages.push({
        role: 'system',
        content: `当前编辑器中的文章内容如下（用户可能要求你基于此修改）：\n${context.substring(0, 5000)}`,
      });
    }

    for (const h of history.slice(-10)) {
      messages.push({ role: h.role, content: h.content });
    }

    // 处理上传文件
    let fileInfo = null;
    if (req.file) {
      try {
        fileInfo = await parseUploadedFile(req.file);
      } catch (e) {
        console.error('文件解析失败:', e.message);
      }
    }

    // 构建用户消息（可能是多模态）
    if (fileInfo && fileInfo.type === 'image') {
      // 图片：用 vision 多模态格式
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `[上传了图片: ${fileInfo.fileName}]\n${message}` },
          {
            type: 'image_url',
            image_url: { url: `data:${fileInfo.mimeType};base64,${fileInfo.content}` },
          },
        ],
      });
    } else if (fileInfo && fileInfo.type === 'text') {
      // 文本文件：将内容作为上下文
      messages.push({
        role: 'user',
        content: `[上传了文件: ${fileInfo.fileName}]\n\n文件内容如下：\n${fileInfo.content}\n\n用户的指令：${message}`,
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 辅助函数：发送 SSE 事件
    function sendEvent(event, data) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    // 先尝试带 tools 的流式调用
    let stream;
    let usedTools = true;
    try {
      stream = await client.chat.completions.create({
        model: config.model,
        messages,
        tools: EDITOR_TOOLS, // 移除了非标准的 search tool 防止被某些模型 API 拒绝导致完全降级
        tool_choice: 'auto',
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        enable_thinking: true,
      });
    } catch (toolsErr) {
      // 如果 tools 参数不被支持，去掉 tools 重试
      console.log('Tools 模式失败，回退纯文本流:', toolsErr.message);
      usedTools = false;
      stream = await client.chat.completions.create({
        model: config.model,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        enable_thinking: true,
        enable_search: true, // 兼容原生无 tools 支持的模型搜索
      });
    }

    // 流式读取并推送 SSE 事件
    let fullContent = '';
    let fullThinking = '';
    const toolCallBuffers = {}; // id -> {name, arguments}

    // 心跳保活：防止长时间思考时 SSE 连接被浏览器/代理超时断开
    const keepAlive1 = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch {}
    }, 15000);

    let lastFinishReason1 = '';

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        const fr = chunk.choices?.[0]?.finish_reason;
        if (fr) lastFinishReason1 = fr;
        if (!delta) continue;

        // 调试：打印 delta 结构
        if (!fullThinking && !fullContent) {
          console.log('[delta keys]', Object.keys(delta));
        }

        // 思维过程（qwen reasoning_content / thinking）
        const thinkingContent = delta.reasoning_content || delta.thinking;
        if (thinkingContent) {
          fullThinking += thinkingContent;
          sendEvent('thinking', { text: thinkingContent });
          console.log('[thinking]', thinkingContent.substring(0, 50));
        }

        // 正文内容
        if (delta.content) {
          fullContent += delta.content;
          sendEvent('content', { text: delta.content });
        }

        // 工具调用（流式聚合 + 实时推送 delta）
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallBuffers[idx]) {
              toolCallBuffers[idx] = { name: '', arguments: '', id: '' };
            }
            if (tc.id) {
              toolCallBuffers[idx].id = tc.id;
            }
            if (tc.function?.name) {
              toolCallBuffers[idx].name = tc.function.name;
              sendEvent('tool_start', { tool: tc.function.name, index: idx });
            }
            if (tc.function?.arguments) {
              toolCallBuffers[idx].arguments += tc.function.arguments;
              // 实时推送工具参数 delta，前端用于流式渲染编辑器内容
              sendEvent('tool_delta', {
                index: idx,
                tool: toolCallBuffers[idx].name,
                argumentsDelta: tc.function.arguments,
                argumentsSoFar: toolCallBuffers[idx].arguments,
              });
            }
          }
        }
      }
    } finally {
      clearInterval(keepAlive1);
    }

    console.log(`[stream1] finish_reason=${lastFinishReason1}, toolCallBuffers=${Object.keys(toolCallBuffers).length}, fullContent长度=${fullContent.length}`);

    // 流结束后，解析工具调用
    const actions = [];
    for (const idx of Object.keys(toolCallBuffers)) {
      const buf = toolCallBuffers[idx];
      try {
        const args = JSON.parse(buf.arguments);
        actions.push({ tool: buf.name, args, id: buf.id });
        sendEvent('tool_call', { tool: buf.name, args });
      } catch (e) {
        console.error('工具调用 JSON 解析失败:', e.message, '原始数据长度:', buf.arguments.length);
        // 尝试修复被截断的 JSON（尾部加 "} 闭合）
        try {
          const fixed = buf.arguments + '"}';
          const args = JSON.parse(fixed);
          actions.push({ tool: buf.name, args, id: buf.id });
          sendEvent('tool_call', { tool: buf.name, args });
        } catch {}
      }
    }

    // === 多轮 Function Calling: 服务端工具循环执行 ===
    // AI 可能需要多轮调用：先 list_svg_templates 获取目录，再 read_svg_template 读取模板内容
    // 每轮执行完服务端工具后，将结果反馈给 AI 继续生成，最多迭代 5 轮防止无限循环
    let multiRound = 0;
    const MAX_ROUNDS = 5;
    
    while (multiRound < MAX_ROUNDS) {
      const serverActions = actions.filter(a => SERVER_TOOLS.has(a.tool));
      if (serverActions.length === 0) break;
      
      multiRound++;
      console.log(`[多轮工具调用] 第 ${multiRound} 轮, 执行 ${serverActions.length} 个服务端工具:`,
        serverActions.map(a => a.tool).join(', '));
      
      sendEvent('content', { text: `\n🔍 正在查询 SVG 模板库（第${multiRound}轮）...\n` });
      
      // 构造 assistant tool_calls 消息
      const asstCalls = serverActions.map((sa, i) => {
        if (!sa.id) sa.id = 'call_' + Date.now().toString(36) + '_' + multiRound + '_' + i;
        return {
          id: sa.id, type: 'function',
          function: { name: sa.tool, arguments: JSON.stringify(sa.args) },
        };
      });
      
      messages.push({ role: 'assistant', content: fullContent || null, tool_calls: asstCalls });
      
      // 执行服务端工具并添加 tool 响应消息
      for (let i = 0; i < serverActions.length; i++) {
        const toolResult = executeServerTool(serverActions[i].tool, serverActions[i].args);
        // 截断过大的模板内容（防止超出上下文长度）
        const truncated = toolResult.length > 15000
          ? toolResult.substring(0, 15000) + '\n<!-- 内容过长已截断 -->'
          : toolResult;
        messages.push({
          role: 'tool', tool_call_id: asstCalls[i].id,
          content: truncated,
        });
      }
      
      // 发起下一轮 API 流式调用
      try {
        const nextStream = await client.chat.completions.create({
          model: config.model, messages,
          tools: EDITOR_TOOLS,
          tool_choice: 'auto', stream: true,
          temperature: config.temperature, max_tokens: config.maxTokens,
          enable_thinking: true,
        });
        
        fullContent = '';
        for (const k of Object.keys(toolCallBuffers)) delete toolCallBuffers[k];
        actions.length = 0;
        let lastFinishReason = '';
        
        // 心跳保活
        const keepAlive = setInterval(() => {
          try { res.write(': keepalive\n\n'); } catch {}
        }, 15000);
        
        try {
          for await (const chunk of nextStream) {
            const delta = chunk.choices?.[0]?.delta;
            const finishReason = chunk.choices?.[0]?.finish_reason;
            if (finishReason) lastFinishReason = finishReason;
            if (!delta) continue;
            
            // 思维过程
            const thinkText = delta.reasoning_content || delta.thinking;
            if (thinkText) {
              fullThinking += thinkText;
              sendEvent('thinking', { text: thinkText });
            }
            
            if (delta.content) { fullContent += delta.content; sendEvent('content', { text: delta.content }); }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallBuffers[idx]) toolCallBuffers[idx] = { name: '', arguments: '', id: '' };
                if (tc.id) toolCallBuffers[idx].id = tc.id;
                if (tc.function?.name) { toolCallBuffers[idx].name = tc.function.name; sendEvent('tool_start', { tool: tc.function.name, index: idx }); }
                if (tc.function?.arguments) {
                  toolCallBuffers[idx].arguments += tc.function.arguments;
                  sendEvent('tool_delta', { index: idx, tool: toolCallBuffers[idx].name, argumentsDelta: tc.function.arguments, argumentsSoFar: toolCallBuffers[idx].arguments });
                }
              }
            }
          }
        } finally {
          clearInterval(keepAlive);
        }
        
        console.log(`[多轮第${multiRound}轮] finish_reason=${lastFinishReason}, toolCallBuffers=${Object.keys(toolCallBuffers).length}, fullContent长度=${fullContent.length}`);
        
        // 解析本轮工具调用（含截断恢复）
        for (const idx of Object.keys(toolCallBuffers)) {
          const buf = toolCallBuffers[idx];
          let parsed = false;
          
          // 1. 尝试正常解析
          try { const a = JSON.parse(buf.arguments); actions.push({ tool: buf.name, args: a, id: buf.id }); sendEvent('tool_call', { tool: buf.name, args: a }); parsed = true; }
          catch {}
          
          // 2. 如果失败，针对 replace_editor_content 做截断恢复
          if (!parsed && (buf.name === 'replace_editor_content' || buf.name === 'insert_content')) {
            console.log(`[截断恢复] 工具 ${buf.name} 的参数 JSON 被截断 (${buf.arguments.length} chars), finish_reason=${lastFinishReason}`);
            // 尝试提取已有的 html 字段内容
            const htmlMatch = buf.arguments.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)$/s);
            if (htmlMatch) {
              try {
                // 闭合被截断的 JSON 字符串
                let htmlContent = JSON.parse('"' + htmlMatch[1] + '"');
                const summaryMatch = buf.arguments.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                const summary = summaryMatch ? JSON.parse('"' + summaryMatch[1] + '"') : '内容生成被截断，已恢复部分内容';
                const args = { html: htmlContent, summary };
                actions.push({ tool: buf.name, args, id: buf.id });
                sendEvent('tool_call', { tool: buf.name, args });
                parsed = true;
                console.log(`[截断恢复] 成功恢复 ${htmlContent.length} 字符的 HTML 内容`);
              } catch (e2) {
                console.error(`[截断恢复] 恢复失败:`, e2.message);
              }
            }
          }
          
          // 3. 通用兜底修复
          if (!parsed) {
            try { const a = JSON.parse(buf.arguments + '"}'); actions.push({ tool: buf.name, args: a, id: buf.id }); sendEvent('tool_call', { tool: buf.name, args: a }); }
            catch {}
          }
        }
        
        // 继续下一轮 while 循环判断是否还有服务端工具需要执行
      } catch (e) {
        console.error(`多轮调用第${multiRound}轮失败:`, e.message);
        console.error('完整错误:', JSON.stringify(e?.error || e, null, 2));
        console.error('状态码:', e?.status);
        sendEvent('content', { text: '\n（SVG查询失败: ' + (e.message || '未知错误') + '，请重试）' });
        break; // 出错时跳出循环，避免无限重试
      }
    }

    // 生成摘要回复：当 AI 调用了编辑器工具时，聊天框只显示操作摘要，不显示原始 HTML
    const hasEditorActions = actions.some(a => ['replace_editor_content', 'insert_content', 'set_title'].includes(a.tool));
    let reply;
    if (hasEditorActions) {
      // 有编辑器操作：回复使用工具摘要，不暴露 HTML 源码到聊天框
      reply = actions.map(a => a.args.summary || `执行了 ${a.tool}`).join('；');
    } else {
      // 纯聊天或无编辑器操作：使用 AI 的正文回复
      if (!usedTools && actions.length === 0 && fullContent && /<section|<div|<p|<span/i.test(fullContent)) {
        reply = '❌ 生成失败：大模型没有调用排版工具。请要求它「必须调用排版工具写入编辑器」。';
      } else {
        reply = fullContent || (actions.length > 0
          ? actions.map(a => a.args.summary || `执行了 ${a.tool}`).join('；')
          : '操作完成');
      }
    }

    // 发送完成事件
    sendEvent('done', { reply, actions, thinking: fullThinking });

    // 关闭 SSE 连接
    res.end();

    // 异步保存聊天记录（绑定 user_id 实现隔离）
    if (documentId) {
      try {
        const db = getDB();
        const insertChat = db.prepare(
          'INSERT INTO ai_chats (document_id, user_id, role, content) VALUES (?, ?, ?, ?)'
        );
        insertChat.run(documentId, req.userId, 'user', message);
        insertChat.run(documentId, req.userId, 'assistant', reply);
      } catch {}
    }
  } catch (error) {
    console.error('AI 聊天错误:', error.message);
    // 如果 SSE 头已发送，用 SSE 格式返回错误
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ success: false, message: 'AI 服务不可用：' + error.message });
    }
  }
});

/**
 * AI 文章改写/润色（非流式，保持简单）
 * POST /api/ai/rewrite
 */
router.post('/rewrite', authLite, async (req, res) => {
  try {
    const { content, action = 'polish', customPrompt } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    const { client, config } = createClient();

    const actionPrompts = {
      polish: '请润色以下文章，使其更流畅专业。调用 replace_editor_content 工具写回编辑器。',
      simplify: '请简化以下内容，使其通俗易懂。调用 replace_editor_content 工具写回编辑器。',
      expand: '请扩展以下内容，添加更多细节。调用 replace_editor_content 工具写回编辑器。',
      title: '请为以下文章生成5个标题建议，直接回复文字即可。',
      summary: '请为以下文章生成120字以内的摘要，直接回复文字即可。',
    };

    const prompt = customPrompt || actionPrompts[action] || actionPrompts.polish;

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${prompt}\n\n${content.substring(0, 5000)}` },
      ],
      tools: EDITOR_TOOLS,
      tool_choice: 'auto',
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const responseMessage = completion.choices[0].message;
    const actions = [];

    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          actions.push({ tool: toolCall.function.name, args });
        } catch (e) {}
      }
    }

    res.json({
      success: true,
      data: { result: responseMessage.content || '操作完成', actions, action },
    });
  } catch (error) {
    console.error('AI 改写错误:', error.message);
    res.status(500).json({ success: false, message: 'AI 服务暂时不可用', error: error.message });
  }
});

/**
 * 获取聊天历史
 * GET /api/ai/history/:documentId
 */
router.get('/history/:documentId', authLite, (req, res) => {
  const db = getDB();
  const { documentId } = req.params;
  const { limit = 50 } = req.query;

  // 权限校验：只有文档 owner 或协作者才能查看 AI 聊天历史
  const doc = db.prepare('SELECT author_id FROM documents WHERE id = ?').get(documentId);
  if (!doc) {
    return res.status(404).json({ success: false, message: '文档不存在' });
  }
  const isOwner = String(doc.author_id) === String(req.userId);
  const isCollaborator = db.prepare(
    'SELECT 1 FROM collaborators WHERE document_id = ? AND user_id = ?'
  ).get(documentId, req.userId);
  if (!isOwner && !isCollaborator) {
    return res.status(403).json({ success: false, message: '无权查看该文档的 AI 记录' });
  }

  // 按 user_id 过滤，实现项目级 AI 记录隔离
  const chats = db.prepare(
    'SELECT * FROM ai_chats WHERE document_id = ? AND (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT ?'
  ).all(documentId, req.userId, parseInt(limit));

  res.json({ success: true, data: chats.reverse() });
});

module.exports = router;
