const prisma = require('../utils/prisma');

const getActiveBatches = () =>
  prisma.poBatch.findMany({
    where: { status: 'OPEN' },
    include: { products: { include: { images: true } } },
  });

const getAllBatches = () => prisma.poBatch.findMany({ orderBy: { createdAt: 'desc' } });

const getBatchBySlug = (slug) =>
  prisma.poBatch.findUnique({
    where: { slug },
    include: { products: { include: { images: true } } },
  });

const createBatch = (data) => prisma.poBatch.create({ data });

const updateBatch = (id, data) => prisma.poBatch.update({ where: { id }, data });

const updateBatchStatus = (id, status) =>
  prisma.poBatch.update({ where: { id }, data: { status } });

module.exports = {
  getActiveBatches,
  getAllBatches,
  getBatchBySlug,
  createBatch,
  updateBatch,
  updateBatchStatus,
};
