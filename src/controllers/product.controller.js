const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/product.service');

const listProductsByBatch = asyncHandler(async (req, res) => {
  const products = await productService.getProductsByBatch(req.params.batchId);
  res.json({ success: true, data: products });
});

const listAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();
  res.json({ success: true, data: products });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  }
  res.json({ success: true, data: product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deactivateProduct(req.params.id);
  res.json({ success: true, message: 'Produk dinonaktifkan' });
});

module.exports = {
  listProductsByBatch,
  listAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
