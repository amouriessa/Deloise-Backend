const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authAdmin = require('../middleware/authAdmin');
const validateRequest = require('../middleware/validateRequest');

router.post(
  '/checkout',
  validateRequest(['batchId', 'customerName', 'customerPhone', 'items']),
  orderController.checkout
);
router.get('/:id', orderController.getOrder);

router.patch(
  '/:id/status',
  authAdmin,
  validateRequest(['status']),
  orderController.updateStatus
);

module.exports = router;
