const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { formatDatePath, generateRandomString } = require('../utils/helpers');

// 配置文件
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'public/uploads');
const imageDir = path.join(uploadsDir, 'image');
const videoDir = path.join(uploadsDir, 'video');
const fileDir = path.join(uploadsDir, 'file');

[uploadsDir, imageDir, videoDir, fileDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datePath = formatDatePath();
    const folder = file.fieldname === 'file' && file.mimetype.startsWith('video/') ? 'video' :
                   file.mimetype.startsWith('image/') ? 'image' : 'file';
    const destPath = path.join(uploadsDir, folder, datePath);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = generateRandomString(6);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${random}${ext}`);
  }
});

const upload = multer({ storage });

// 获取配置
router.get('/', (req, res) => {
  const { action } = req.query;
  
  if (action === 'config') {
    res.json(config);
  } else {
    res.json({ state: 'SUCCESS', data: config });
  }
});

// 上传图片
router.post('/', upload.single('file'), (req, res) => {
  const { action } = req.query;
  
  if (!req.file) {
    return res.json({ state: 'FAIL', msg: 'No file uploaded' });
  }

  const file = req.file;
  const url = `/uploads/${file.destination.split('uploads/')[1]}/${file.filename}`;
  
  const result = {
    state: 'SUCCESS',
    url: url,
    title: file.filename,
    original: file.originalname,
    type: path.extname(file.originalname),
    size: file.size
  };

  // 处理涂鸦上传
  if (action === 'uploadscrawl') {
    const base64 = req.body.file;
    // 处理 base64 图片逻辑
    result.url = url;
  }

  res.json(result);
});

// 抓取远程图片
router.post('/catchimage', async (req, res) => {
  const { source } = req.body;
  const urls = Array.isArray(source) ? source : [source].filter(Boolean);
  
  if (urls.length === 0 || urls.length > 20) {
    return res.json({ state: 'SUCCESS', list: [], msg: urls.length === 0 ? '未提供图片URL' : '单次最多抓取20张图片' });
  }
  
  const results = [];
  for (const imgUrl of urls) {
    try {
      const response = await axios.get(imgUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        validateStatus: (status) => status < 400,
      });
      
      const contentType = response.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        results.push({ state: 'FAIL', source: imgUrl, msg: '非图片类型: ' + contentType });
        continue;
      }
      
      // 确定文件扩展名
      const mimeToExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/bmp': '.bmp' };
      let ext = mimeToExt[contentType];
      if (!ext) {
        // 尝试从 URL 中提取扩展名
        const urlExt = path.extname(new URL(imgUrl, 'http://x').pathname).toLowerCase();
        ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(urlExt) ? urlExt : '.jpg';
      }
      
      // 确保目录存在
      const datePath = formatDatePath();
      const destDir = path.join(imageDir, datePath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // 生成文件名并保存
      const filename = `${Date.now()}_${generateRandomString(6)}${ext}`;
      const filePath = path.join(destDir, filename);
      fs.writeFileSync(filePath, Buffer.from(response.data));
      
      const url = `/uploads/image/${datePath}/${filename}`;
      results.push({
        state: 'SUCCESS',
        url: url,
        title: filename,
        original: path.basename(imgUrl) || 'remote.jpg',
        type: ext,
        size: response.data.length,
      });
    } catch (error) {
      results.push({ state: 'FAIL', source: imgUrl, msg: error.message });
    }
  }
  
  res.json({ state: 'SUCCESS', list: results });
});

// 图片列表
router.get('/listimage', (req, res) => {
  const { start = 0, size = 20 } = req.query;
  
  // 扫描图片目录
  const list = [];
  const walkDir = (dir, prefix = '') => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, `${prefix}${file}/`);
      } else if (/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)) {
        list.push({
          url: `/uploads/image/${prefix}${file}`,
          mtime: stat.mtime.getTime()
        });
      }
    });
  };
  
  walkDir(imageDir);
  
  // 排序并分页
  list.sort((a, b) => b.mtime - a.mtime);
  const total = list.length;
  const pagedList = list.slice(parseInt(start), parseInt(start) + parseInt(size));
  
  res.json({
    state: 'SUCCESS',
    list: pagedList,
    start: parseInt(start),
    total: total
  });
});

module.exports = router;
