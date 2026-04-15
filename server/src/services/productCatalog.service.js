const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const PRODUCT_SETTINGS_KEY = 'membership_products';

const DEFAULT_PRODUCTS = [
  {
    id: 'basic',
    code: 'basic',
    name: '基础版',
    desc: '适合个人创作者的轻量套餐',
    color: 'blue',
    enabled: true,
    prices: { monthly: 29, quarterly: 79, yearly: 199 },
    features: ['50 篇文档', '1GB 存储空间', '10 个协作者', '1000 次 AI 调用/天'],
  },
  {
    id: 'pro',
    code: 'pro',
    name: '专业版',
    desc: '适合高频创作和内容团队',
    color: 'pink',
    enabled: true,
    prices: { monthly: 99, quarterly: 269, yearly: 799 },
    features: ['200 篇文档', '5GB 存储空间', '50 个协作者', '10000 次 AI 调用/天', '高级模板', '数据统计分析'],
  },
  {
    id: 'enterprise',
    code: 'enterprise',
    name: '企业版',
    desc: '适合企业和多角色协作团队',
    color: 'purple',
    enabled: true,
    prices: { monthly: 299, quarterly: 799, yearly: 1999 },
    features: ['无限文档', '无限存储空间', '无限协作者', '无限 AI 调用', '专属客服', 'API 接口权限'],
  },
];

function sanitizeProduct(product = {}) {
  const prices = product.prices || {};
  const code = String(product.code || product.id || '').trim();

  return {
    id: String(product.id || code || uuidv4()),
    code,
    name: String(product.name || '').trim(),
    desc: String(product.desc || '').trim(),
    color: String(product.color || 'blue').trim() || 'blue',
    enabled: product.enabled !== false,
    prices: {
      monthly: Number(prices.monthly || 0),
      quarterly: Number(prices.quarterly || 0),
      yearly: Number(prices.yearly || 0),
    },
    features: Array.isArray(product.features)
      ? product.features.map((item) => String(item).trim()).filter(Boolean)
      : [],
  };
}

async function readCatalogSetting() {
  const row = await db('system_settings').where({ key: PRODUCT_SETTINGS_KEY }).first();
  if (!row?.value) return null;

  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.map(sanitizeProduct) : null;
  } catch {
    return null;
  }
}

async function saveCatalog(products) {
  const sanitizedProducts = products.map(sanitizeProduct);

  await db('system_settings')
    .insert({
      key: PRODUCT_SETTINGS_KEY,
      value: JSON.stringify(sanitizedProducts),
      group: 'commerce',
      description: '会员套餐目录',
    })
    .onConflict('key')
    .merge({
      value: JSON.stringify(sanitizedProducts),
      group: 'commerce',
      description: '会员套餐目录',
      updated_at: new Date(),
    });

  return sanitizedProducts;
}

const ProductCatalogService = {
  PRODUCT_SETTINGS_KEY,

  async getCatalog() {
    const products = await readCatalogSetting();
    return products && products.length > 0 ? products : DEFAULT_PRODUCTS.map(sanitizeProduct);
  },

  async list({ page = 1, limit = 20 } = {}) {
    const products = await this.getCatalog();
    const start = Math.max(page - 1, 0) * limit;
    const list = products.slice(start, start + limit);
    return {
      list,
      total: products.length,
      page,
      limit,
    };
  },

  async findById(id) {
    const products = await this.getCatalog();
    return products.find((item) => String(item.id) === String(id)) || null;
  },

  async findByCode(code) {
    const products = await this.getCatalog();
    return products.find((item) => String(item.code) === String(code)) || null;
  },

  async create(data) {
    const products = await this.getCatalog();
    const nextProduct = sanitizeProduct({
      id: data.id || data.code || uuidv4(),
      code: data.code || data.id || uuidv4(),
      ...data,
    });

    if (!nextProduct.name) {
      throw Object.assign(new Error('套餐名称不能为空'), { statusCode: 400 });
    }
    if (!nextProduct.code) {
      throw Object.assign(new Error('套餐编码不能为空'), { statusCode: 400 });
    }
    if (products.some((item) => item.code === nextProduct.code)) {
      throw Object.assign(new Error('套餐编码已存在'), { statusCode: 409 });
    }

    await saveCatalog([...products, nextProduct]);
    return nextProduct;
  },

  async update(id, data) {
    const products = await this.getCatalog();
    const index = products.findIndex((item) => String(item.id) === String(id));
    if (index === -1) {
      throw Object.assign(new Error('套餐不存在'), { statusCode: 404 });
    }

    const nextProduct = sanitizeProduct({
      ...products[index],
      ...data,
      id: products[index].id,
      code: data.code !== undefined ? String(data.code).trim() : products[index].code,
    });

    if (!nextProduct.name) {
      throw Object.assign(new Error('套餐名称不能为空'), { statusCode: 400 });
    }

    const duplicate = products.find((item, itemIndex) => itemIndex !== index && item.code === nextProduct.code);
    if (duplicate) {
      throw Object.assign(new Error('套餐编码已存在'), { statusCode: 409 });
    }

    products[index] = nextProduct;
    await saveCatalog(products);
    return nextProduct;
  },

  async remove(id) {
    const products = await this.getCatalog();
    const nextProducts = products.filter((item) => String(item.id) !== String(id));
    if (nextProducts.length === products.length) {
      throw Object.assign(new Error('套餐不存在'), { statusCode: 404 });
    }
    await saveCatalog(nextProducts);
  },
};

module.exports = ProductCatalogService;
