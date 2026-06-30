const prisma = require('../utils/prisma');
const ApiError = require('../utils/ApiError');
const generateOrderNumber = require('../utils/generateOrderNumber');

const DP_PERCENTAGE = 0.5;

async function createOrder({ batchId, customerName, customerPhone, items }) {
  if (!items || items.length === 0) {
    throw new ApiError(400, 'Keranjang tidak boleh kosong');
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.poBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status !== 'OPEN') {
      throw new ApiError(400, 'Batch PO ini sudah tidak menerima order');
    }

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });

      if (!product || product.batchId !== batchId) {
        throw new ApiError(400, 'Salah satu produk tidak valid untuk batch ini');
      }
      if (product.stock < item.qty) {
        throw new ApiError(400, `Stok "${product.name}" tidak cukup`);
      }

      const subtotal = product.price * item.qty;
      totalAmount += subtotal;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        qty: item.qty,
        subtotal,
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: item.qty }, sold: { increment: item.qty } },
      });
    }

    const dpAmount = Math.ceil(totalAmount * DP_PERCENTAGE);

    return tx.order.create({
      data: {
        batchId,
        orderNumber: generateOrderNumber(),
        customerName,
        customerPhone,
        totalAmount,
        dpAmount,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });
  });
}

const getOrderById = (id) =>
  prisma.order.findUnique({ where: { id }, include: { items: true, payments: true } });

const updateOrderStatus = (id, status) =>
  prisma.order.update({ where: { id }, data: { status } });

module.exports = { createOrder, getOrderById, updateOrderStatus };
