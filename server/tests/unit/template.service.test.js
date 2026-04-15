const TemplateRepo = require('../../src/repositories/template.repo');
const TemplateService = require('../../src/services/template.service');

jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = {
    where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn(),
    select: jest.fn(), clone: jest.fn(), clearSelect: jest.fn(), clearOrder: jest.fn(),
    count: jest.fn(), orderBy: jest.fn(), limit: jest.fn(), offset: jest.fn(),
    groupBy: jest.fn(), increment: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  fn.mockReturnValue(chain);
  chain.count.mockResolvedValue([{ count: 0 }]);
  chain.first.mockResolvedValue(null);
  fn.fn = { now: jest.fn(() => new Date()) };
  return fn;
});

jest.mock('../../src/repositories/template.repo');

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getTemplate ───────────────────────────────────────
  describe('getTemplate', () => {
    it('should return a public template for any user', async () => {
      const template = { id: 1, name: 'Tpl', is_public: 1, author_id: 10, content: '<p>hi</p>' };
      TemplateRepo.findById.mockResolvedValue(template);

      const result = await TemplateService.getTemplate(1, { id: 5 });
      expect(result).toEqual(template);
    });

    it('should return a private template to its owner', async () => {
      const template = { id: 1, name: 'Tpl', is_public: 0, author_id: 5 };
      TemplateRepo.findById.mockResolvedValue(template);

      const result = await TemplateService.getTemplate(1, { id: 5 });
      expect(result).toEqual(template);
    });

    it('should return a public template if no user', async () => {
      const template = { id: 1, name: 'Tpl', is_public: 1, author_id: 5 };
      TemplateRepo.findById.mockResolvedValue(template);

      const result = await TemplateService.getTemplate(1, null);
      expect(result).toEqual(template);
    });

    it('should throw 404 if template not found', async () => {
      TemplateRepo.findById.mockResolvedValue(null);

      await expect(TemplateService.getTemplate(999, { id: 1 }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 for private template with non-owner user', async () => {
      const template = { id: 1, name: 'Tpl', is_public: 0, author_id: 10 };
      TemplateRepo.findById.mockResolvedValue(template);

      await expect(TemplateService.getTemplate(1, { id: 5 }))
        .rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 403 for private template with no user', async () => {
      const template = { id: 1, name: 'Tpl', is_public: 0, author_id: 10 };
      TemplateRepo.findById.mockResolvedValue(template);

      await expect(TemplateService.getTemplate(1, null))
        .rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── createTemplate ────────────────────────────────────
  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const created = { id: 1, name: 'New', content: '<p>hi</p>', author_id: 5 };
      TemplateRepo.create.mockResolvedValue(created);

      const result = await TemplateService.createTemplate(
        { name: 'New', content: '<p>hi</p>' },
        { id: 5 }
      );

      expect(TemplateRepo.create).toHaveBeenCalledWith({
        name: 'New', content: '<p>hi</p>', author_id: 5,
      });
      expect(result).toEqual(created);
    });

    it('should throw 400 if name is missing', async () => {
      await expect(
        TemplateService.createTemplate({ content: '<p>hi</p>' }, { id: 1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 400 if content is missing', async () => {
      await expect(
        TemplateService.createTemplate({ name: 'No content' }, { id: 1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 400 if both name and content are missing', async () => {
      await expect(
        TemplateService.createTemplate({}, { id: 1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── updateTemplate ────────────────────────────────────
  describe('updateTemplate', () => {
    it('should update template as owner', async () => {
      const existing = { id: 1, author_id: 5 };
      const updated = { id: 1, name: 'Updated', author_id: 5 };
      TemplateRepo.findById.mockResolvedValue(existing);
      TemplateRepo.update.mockResolvedValue(updated);

      const result = await TemplateService.updateTemplate(1, { name: 'Updated' }, { id: 5, role: 'user' });

      expect(TemplateRepo.update).toHaveBeenCalledWith(1, { name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('should update template as admin (non-owner)', async () => {
      const existing = { id: 1, author_id: 10 };
      const updated = { id: 1, name: 'Admin Edit' };
      TemplateRepo.findById.mockResolvedValue(existing);
      TemplateRepo.update.mockResolvedValue(updated);

      const result = await TemplateService.updateTemplate(1, { name: 'Admin Edit' }, { id: 5, role: 'admin' });
      expect(result).toEqual(updated);
    });

    it('should throw 404 if template not found', async () => {
      TemplateRepo.findById.mockResolvedValue(null);

      await expect(
        TemplateService.updateTemplate(999, { name: 'x' }, { id: 1, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 for non-owner non-admin user', async () => {
      const existing = { id: 1, author_id: 10 };
      TemplateRepo.findById.mockResolvedValue(existing);

      await expect(
        TemplateService.updateTemplate(1, { name: 'x' }, { id: 5, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── deleteTemplate ────────────────────────────────────
  describe('deleteTemplate', () => {
    it('should soft-delete template as owner', async () => {
      TemplateRepo.findById.mockResolvedValue({ id: 1, author_id: 5 });
      TemplateRepo.softDelete.mockResolvedValue();

      await TemplateService.deleteTemplate(1, { id: 5, role: 'user' });

      expect(TemplateRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should soft-delete template as admin', async () => {
      TemplateRepo.findById.mockResolvedValue({ id: 1, author_id: 10 });
      TemplateRepo.softDelete.mockResolvedValue();

      await TemplateService.deleteTemplate(1, { id: 5, role: 'admin' });

      expect(TemplateRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw 404 if template not found', async () => {
      TemplateRepo.findById.mockResolvedValue(null);

      await expect(
        TemplateService.deleteTemplate(999, { id: 1, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 for non-owner non-admin', async () => {
      TemplateRepo.findById.mockResolvedValue({ id: 1, author_id: 10 });

      await expect(
        TemplateService.deleteTemplate(1, { id: 5, role: 'user' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── listTemplates ─────────────────────────────────────
  describe('listTemplates', () => {
    it('should list templates with user authorId', async () => {
      const mockResult = { list: [], total: 0, page: 1, limit: 20 };
      TemplateRepo.list.mockResolvedValue(mockResult);

      const result = await TemplateService.listTemplates({ page: 1 }, { id: 5 });

      expect(TemplateRepo.list).toHaveBeenCalledWith({ page: 1, authorId: 5 });
      expect(result).toEqual(mockResult);
    });

    it('should list templates without user', async () => {
      const mockResult = { list: [], total: 0, page: 1, limit: 20 };
      TemplateRepo.list.mockResolvedValue(mockResult);

      const result = await TemplateService.listTemplates({ page: 1 }, null);

      expect(TemplateRepo.list).toHaveBeenCalledWith({ page: 1, authorId: undefined });
      expect(result).toEqual(mockResult);
    });
  });

  // ── getCategories ─────────────────────────────────────
  describe('getCategories', () => {
    it('should return categories from repo', async () => {
      const cats = [{ category: 'tech', count: 5 }, { category: 'life', count: 3 }];
      TemplateRepo.getCategories.mockResolvedValue(cats);

      const result = await TemplateService.getCategories();

      expect(TemplateRepo.getCategories).toHaveBeenCalled();
      expect(result).toEqual(cats);
    });
  });

  // ── useTemplate ───────────────────────────────────────
  describe('useTemplate', () => {
    it('should increment use count', async () => {
      TemplateRepo.incrementUseCount.mockResolvedValue();

      await TemplateService.useTemplate(1);

      expect(TemplateRepo.incrementUseCount).toHaveBeenCalledWith(1);
    });
  });

  // ── cloneTemplate ─────────────────────────────────────
  describe('cloneTemplate', () => {
    it('should clone template successfully', async () => {
      const cloned = { id: 2, name: 'Tpl (副本)', author_id: 5 };
      TemplateRepo.clone.mockResolvedValue(cloned);

      const result = await TemplateService.cloneTemplate(1, { id: 5 });

      expect(TemplateRepo.clone).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual(cloned);
    });

    it('should throw 404 if original template not found', async () => {
      TemplateRepo.clone.mockResolvedValue(null);

      await expect(
        TemplateService.cloneTemplate(999, { id: 5 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
