const express = require('express');
const router = express.Router();

router.use('/batches', require('./batch.routes'));
router.use('/products', require('./product.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));

module.exports = router;
