const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authAdmin = require('../middleware/authAdmin');
const validateRequest = require('../middleware/validateRequest');

// Public
router.get('/batch/:batchId', productController.listProductsByBatch);

// Admin only
router.get('/', authAdmin, productController.listAllProducts);
router.get('/:id', authAdmin, productController.getProduct);
router.post(
  '/',
  authAdmin,
  validateRequest(['batchId', 'name', 'slug', 'price', 'stock']),
  productController.createProduct
);
router.put('/:id', authAdmin, productController.updateProduct);
router.delete('/:id', authAdmin, productController.deleteProduct);

module.exports = router;
