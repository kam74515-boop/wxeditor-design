const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { formatDatePath, generateRandomString } = require('../utils/helpers');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
const imageDir = path.join(uploadsDir, 'image');
const videoDir = path.join(uploadsDir, 'video');
const fileDir = path.join(uploadsDir, 'file');

[uploadsDir, imageDir, videoDir, fileDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datePath = formatDatePath();
    const folder = file.mimetype.startsWith('image/') ? 'image' :
      file.mimetype.startsWith('video/') ? 'video' : 'file';
    const destPath = path.join(uploadsDir, folder, datePath);
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${generateRandomString(6)}${ext}`);
  },
});

const upload = multer({ storage });

const config = {
  imageActionName: 'uploadimage',
  imageFieldName: 'upfile',
  imageMaxSize: 4096000,
  imageAllowFiles: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  imageCompressEnable: true,
  imageCompressBorder: 1600,
  imageInsertAlign: 'none',
  imageUrlPrefix: '',
  imagePathFormat: '/uploads/image/{yyyy}{mm}{dd}/{filename}',

  videoActionName: 'uploadvideo',
  videoFieldName: 'upfile',
  videoMaxSize: 102400000,
  videoAllowFiles: ['.mp4', '.webm', '.ogg'],

  fileActionName: 'uploadfile',
  fileFieldName: 'upfile',
  fileMaxSize: 51200000,
  fileAllowFiles: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
};

router.get('/', (req, res) => {
  try {
    const { action } = req.query;
    if (action === 'config') {
      return res.json(config);
    }
    res.status(400).json({ success: false, message: '未知 action' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/uploadimage', upload.single('upfile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ state: '文件上传失败' });
    const url = `/uploads/image/${req.file.filename}`;
    res.json({ state: 'SUCCESS', url, title: req.file.originalname, original: req.file.originalname });
  } catch (err) {
    res.status(500).json({ state: '上传失败', message: err.message });
  }
});

router.post('/uploadvideo', upload.single('upfile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ state: '文件上传失败' });
    const url = `/uploads/video/${req.file.filename}`;
    res.json({ state: 'SUCCESS', url, title: req.file.originalname, original: req.file.originalname });
  } catch (err) {
    res.status(500).json({ state: '上传失败', message: err.message });
  }
});

router.post('/uploadfile', upload.single('upfile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ state: '文件上传失败' });
    const url = `/uploads/file/${req.file.filename}`;
    res.json({ state: 'SUCCESS', url, title: req.file.originalname, original: req.file.originalname });
  } catch (err) {
    res.status(500).json({ state: '上传失败', message: err.message });
  }
});

router.post('/upload', upload.single('upfile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ state: '文件上传失败' });
    const folder = req.file.mimetype.startsWith('image/') ? 'image' :
      req.file.mimetype.startsWith('video/') ? 'video' : 'file';
    const url = `/uploads/${folder}/${req.file.filename}`;
    res.json({ state: 'SUCCESS', url, title: req.file.originalname, original: req.file.originalname });
  } catch (err) {
    res.status(500).json({ state: '上传失败', message: err.message });
  }
});

module.exports = router;
