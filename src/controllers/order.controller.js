const asyncHandler = require('../utils/asyncHandler');
const orderService = require('../services/order.service');
const midtransService = require('../services/midtrans.service');

const checkout = asyncHandler(async (req, res) => {
  const { batchId, customerName, customerPhone, items } = req.body;

  const order = await orderService.createOrder({ batchId, customerName, customerPhone, items });
  const snapTransaction = await midtransService.createTransaction(order);

  res.status(201).json({
    success: true,
    data: {
      order,
      snapToken: snapTransaction.token,
      redirectUrl: snapTransaction.redirect_url,
    },
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
  }
  res.json({ success: true, data: order });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await orderService.updateOrderStatus(req.params.id, status);
  res.json({ success: true, data: order });
});

module.exports = { checkout, getOrder, updateStatus };
