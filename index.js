require("dotenv").config();
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");
const { PrismaClient } = require("@prisma/client");

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PROD === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});


app.get("/", (req, res) => {
  res.json({ message: "Backend OK" });
});

app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, price, image, description } = req.body;
    const product = await prisma.product.create({
      data: { name, price: Number(price), image, description },
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { productId, userName, email, address, amount = 1 } = req.body;

    if (!productId || !userName || !email || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const order = await prisma.order.create({
      data: {
        productId,
        userName,
        email,
        address,
        amount: Number(amount),
        paymentStatus: "pending",
      },
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.post("/checkout", async (req, res) => {
  try {
    const { productId, userName, email, address, quantity = 1 } = req.body;

    if (!productId || !userName || !email || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const grossAmount = product.price * Number(quantity);

    const order = await prisma.order.create({
      data: {
        productId,
        userName,
        email,
        address,
        amount: Number(quantity),
        paymentStatus: "pending",
      },
    });

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: product.id,
          price: product.price,
          quantity: Number(quantity),
          name: product.name,
        },
      ],
      customer_details: {
        first_name: userName,
        email: email,
        billing_address: {
          address: address,
        },
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await prisma.order.update({
      where: { id: order.id },
      data: { snapToken: transaction.token },
    });

    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (err) {
    console.error("checkout error", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

// Midtrans webhook (notification)
app.post("/midtrans/webhook", async (req, res) => {
  try {
    const notification = req.body;

    const status = notification.transaction_status || notification.status;
    const orderId =
      notification.order_id || notification.orderId || notification.orderId;

    if (!orderId) {
      console.warn("Webhook missing order id", notification);
      return res.status(400).json({ error: "Missing order id" });
    }

    // paymentStatus
    if (
      status === "settlement" ||
      status === "capture" ||
      status === "success"
    ) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "paid" },
      });
    } else if (status === "expire") {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "expired" },
      });
    } else if (
      status === "cancel" ||
      status === "deny" ||
      status === "failure"
    ) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "failed" },
      });
    } else if (status === "pending") {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "pending" },
      });
    }

    res.json({ message: "ok" });
  } catch (err) {
    console.error("webhook error", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

// Get order by id
app.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
