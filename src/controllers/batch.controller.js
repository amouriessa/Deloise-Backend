const asyncHandler = require('../utils/asyncHandler');
const batchService = require('../services/batch.service');

const listActiveBatches = asyncHandler(async (req, res) => {
  const batches = await batchService.getActiveBatches();
  res.json({ success: true, data: batches });
});

const listAllBatches = asyncHandler(async (req, res) => {
  const batches = await batchService.getAllBatches();
  res.json({ success: true, data: batches });
});

const getBatch = asyncHandler(async (req, res) => {
  const batch = await batchService.getBatchBySlug(req.params.slug);
  if (!batch) {
    return res.status(404).json({ success: false, message: 'Batch PO tidak ditemukan' });
  }
  res.json({ success: true, data: batch });
});

const createBatch = asyncHandler(async (req, res) => {
  const batch = await batchService.createBatch(req.body);
  res.status(201).json({ success: true, data: batch });
});

const updateBatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const batch = await batchService.updateBatchStatus(req.params.id, status);
  res.json({ success: true, data: batch });
});

module.exports = { listActiveBatches, listAllBatches, getBatch, createBatch, updateBatchStatus };
