const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../utils/prisma');
const orderService = require('../services/order.service');

const handleNotification = asyncHandler(async (req, res) => {
  const notification = req.body;
  const { order_id: midtransOrderId, transaction_status, gross_amount } = notification;

  const order = await prisma.order.findUnique({ where: { orderNumber: midtransOrderId } });
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
  }

  let paymentStatus = 'PENDING';
  let orderStatus = order.status;

  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    paymentStatus = 'SUCCESS';
    orderStatus = 'DP_PAID';
  } else if (transaction_status === 'expire') {
    paymentStatus = 'EXPIRED';
    orderStatus = 'EXPIRED';
  } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
    paymentStatus = 'FAILED';
    orderStatus = 'CANCELLED';
  }

  await prisma.payment.upsert({
    where: { midtransOrderId },
    update: {
      status: paymentStatus,
      amount: Number(gross_amount),
      paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
    },
    create: {
      orderId: order.id,
      midtransOrderId,
      status: paymentStatus,
      amount: Number(gross_amount),
      paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
    },
  });

  await orderService.updateOrderStatus(order.id, orderStatus);

  res.json({ success: true });
});

module.exports = { handleNotification };
