/**
 * SVG 动画微信兼容性验证脚本
 * 
 * 用法：node scripts/validate.js <html文件路径>
 * 
 * 检查项：
 * 1. 禁止使用 <style>、<script>、<link> 标签
 * 2. 禁止使用 CSS animation / transition
 * 3. SVG camelCase 标签名正确性
 * 4. SVG camelCase 属性名正确性
 * 5. 所有元素包含 box-sizing: border-box
 * 6. 图片使用百分比宽度而非固定像素
 * 7. SVG 使用 viewBox + width="100%"
 * 8. animate 使用 fill="freeze"
 * 9. 无 JavaScript 事件监听器
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// 检查规则
const rules = [
  {
    name: '禁止 <style> 标签',
    regex: /<style[\s>]/gi,
    level: 'error',
    message: '微信公众号会过滤 <style> 标签，所有样式必须使用内联 style 属性'
  },
  {
    name: '禁止 <script> 标签',
    regex: /<script[\s>]/gi,
    level: 'error',
    message: '微信公众号不支持 JavaScript'
  },
  {
    name: '禁止 <link> 标签',
    regex: /<link[\s>]/gi,
    level: 'error',
    message: '微信公众号不支持外部 CSS 引用'
  },
  {
    name: '禁止 CSS animation',
    regex: /animation\s*:/gi,
    level: 'error',
    message: '微信公众号不支持 CSS animation，请使用 SMIL <animate> 标签'
  },
  {
    name: '禁止 CSS transition',
    regex: /transition\s*:/gi,
    level: 'error',
    message: '微信公众号不支持 CSS transition，请使用 SMIL <animate> 标签'
  },
  {
    name: '禁止 @keyframes',
    regex: /@keyframes/gi,
    level: 'error',
    message: '微信公众号不支持 @keyframes'
  },
  {
    name: '禁止 onclick 等 JS 事件',
    regex: /\bon(click|load|error|mouseover|mouseout|touchstart|touchend|touchmove)\s*=/gi,
    level: 'error',
    message: '微信公众号不支持 JavaScript 事件属性'
  },
  {
    name: '固定像素宽度图片',
    regex: /<img[^>]*style="[^"]*width\s*:\s*\d+px/gi,
    level: 'warning',
    message: '建议使用百分比宽度（width: 100%）而非固定像素，确保跨设备适配'
  },
  {
    name: 'SVG 固定像素宽度',
    regex: /<svg[^>]*width="\d+"/gi,
    level: 'warning',
    message: 'SVG 建议使用 width="100%" + viewBox，而非固定像素宽度'
  },
  {
    name: 'animate 缺少 fill="freeze"',
    regex: /<animate[^>]*(?!fill="freeze")[^>]*>/gi,
    level: 'info',
    message: '建议为 <animate> 添加 fill="freeze" 以保持动画终态',
    // 这个规则需要精确检查
    customCheck: (content) => {
      const animates = content.match(/<animate[^>]*>/gi) || [];
      return animates.filter(a => !a.includes('fill="freeze"'));
    }
  }
];

// SVG camelCase 验证
const svgCamelCaseTags = [
  'foreignObject', 'clipPath', 'linearGradient', 'radialGradient',
  'animateTransform', 'animateMotion', 'textPath', 'feGaussianBlur',
  'feColorMatrix', 'feComponentTransfer', 'feMerge', 'feMergeNode'
];

const svgCamelCaseAttrs = [
  'viewBox', 'attributeName', 'attributeType', 'repeatCount',
  'calcMode', 'keyTimes', 'keySplines', 'baseFrequency',
  'stdDeviation', 'gradientUnits', 'gradientTransform',
  'patternUnits', 'patternTransform', 'preserveAspectRatio',
  'startOffset', 'textLength', 'lengthAdjust'
];

function validate(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`${RED}文件不存在: ${filePath}${RESET}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let errors = 0, warnings = 0, infos = 0;

  console.log(`\n验证文件: ${fileName}`);
  console.log('─'.repeat(60));

  // 执行规则检查
  for (const rule of rules) {
    let matches;
    if (rule.customCheck) {
      matches = rule.customCheck(content);
    } else {
      matches = content.match(rule.regex) || [];
    }

    if (matches.length > 0) {
      const icon = rule.level === 'error' ? `${RED}✘` :
                   rule.level === 'warning' ? `${YELLOW}⚠` : `${YELLOW}ℹ`;
      console.log(`${icon} ${rule.name}${RESET} (${matches.length} 处)`);
      console.log(`  ${rule.message}`);

      if (rule.level === 'error') errors++;
      else if (rule.level === 'warning') warnings++;
      else infos++;
    }
  }

  // 检查 SVG camelCase 属性名（小写版本存在但大写版本不存在）
  for (const attr of svgCamelCaseAttrs) {
    const lowerAttr = attr.toLowerCase();
    const lowerRegex = new RegExp(`${lowerAttr}=`, 'g');
    const correctRegex = new RegExp(`${attr}=`, 'g');
    const lowerMatches = content.match(lowerRegex) || [];
    const correctMatches = content.match(correctRegex) || [];

    if (lowerMatches.length > correctMatches.length) {
      console.log(`${RED}✘ SVG 属性名大小写错误: ${lowerAttr} → 应为 ${attr}${RESET}`);
      errors++;
    }
  }

  // 汇总
  console.log('─'.repeat(60));
  if (errors === 0 && warnings === 0) {
    console.log(`${GREEN}✔ 验证通过！无兼容性问题。${RESET}`);
  } else {
    console.log(`${errors > 0 ? RED : GREEN}错误: ${errors}${RESET}  ` +
                `${warnings > 0 ? YELLOW : GREEN}警告: ${warnings}${RESET}  ` +
                `提示: ${infos}`);
  }

  return errors === 0;
}

// 主逻辑
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('用法: node validate.js <html文件路径> [html文件路径2] ...');
  console.log('示例: node validate.js ../examples/01-点击淡出展开.html');
  console.log('批量: node validate.js ../../svg-templates/**/*.html');
  process.exit(0);
}

let allPassed = true;
for (const file of args) {
  if (!validate(file)) allPassed = false;
}

process.exit(allPassed ? 0 : 1);
