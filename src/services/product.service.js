const prisma = require('../utils/prisma');
const ApiError = require('../utils/ApiError');

const getProductsByBatch = (batchId) =>
  prisma.product.findMany({
    where: { batchId, isActive: true },
    include: { images: true },
  });

const getAllProducts = () =>
  prisma.product.findMany({
    include: { images: true, batch: { select: { name: true, status: true } } },
    orderBy: { id: 'desc' },
  });

const getProductById = (id) =>
  prisma.product.findUnique({ where: { id }, include: { images: true } });

const createProduct = async ({ batchId, name, slug, price, stock, images = [] }) => {
  try {
    return await prisma.product.create({
      data: {
        batchId,
        name,
        slug,
        price,
        stock,
        images: { create: images.map((url, i) => ({ url, order: i })) },
      },
      include: { images: true },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(409, 'Slug produk sudah dipakai, coba slug lain');
    }
    throw err;
  }
};

const updateProduct = async (id, { images, ...data }) => {
  try {
    return await prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...data,
          ...(images ? { images: { create: images.map((url, i) => ({ url, order: i })) } } : {}),
        },
        include: { images: true },
      });
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(409, 'Slug produk sudah dipakai, coba slug lain');
    }
    throw err;
  }
};

const deactivateProduct = (id) =>
  prisma.product.update({ where: { id }, data: { isActive: false } });

module.exports = {
  getProductsByBatch,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
};
