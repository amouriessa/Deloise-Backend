const midtransClient = require('midtrans-client');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function createTransaction(order) {
  const parameter = {
    transaction_details: {
      order_id: order.orderNumber,
      gross_amount: order.dpAmount,
    },
    customer_details: {
      first_name: order.customerName,
      phone: order.customerPhone,
    },
  };

  return snap.createTransaction(parameter);
}

module.exports = { createTransaction };
