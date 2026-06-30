const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

router.post('/notification', paymentController.handleNotification);

module.exports = router;
