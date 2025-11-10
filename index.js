require("dotenv").config();
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const multer = require("multer");
const upload = multer({ dest: "uploads/" }); 

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const SECRET = process.env.ADMIN_JWT_SECRET || "changeme";

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MIDTRANS
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PROD === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

// ROOT
app.get("/", (req, res) => {
  res.json({ message: "Backend OK" });
});

// ADMIN LOGIN
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "7d" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// ADMIN MIDDLEWARE
function adminOnly(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });

  const token = auth.split(" ")[1];
  try {
    jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: "Unauthorized" });
  }
}

// GET PRODUCTS (PUBLIC)
app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// CREATE PRODUCT (ADMIN)
// app.post("/products", adminOnly, async (req, res) => {
//   try {
//     const { name, price, image, description } = req.body;
//     const product = await prisma.product.create({
//       data: { name, price: Number(price), image, description },
//     });
//     res.json(product);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to create product" });
//   }
// });

app.post("/products", adminOnly, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Image required" });

    // Upload ke Cloudinary
    const cloud = await cloudinary.uploader.upload(file.path, {
      folder: "deloise_products",
    });

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        description,
        image: cloud.secure_url,
      },
    });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});


// DELETE PRODUCT (ADMIN)
app.delete('/products/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// UPDATE PRODUCT (ADMIN)
app.put('/products/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, image, description } = req.body;
    const prod = await prisma.product.update({
      where: { id },
      data: { name, price: Number(price), image, description }
    });
    res.json(prod);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});


// ORDER
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

// CHECKOUT
app.post("/checkout", async (req, res) => {
  try {
    const { productId, userName, email, address, quantity = 1 } = req.body;

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
        billing_address: { address },
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

// WEBHOOK
app.post("/midtrans/webhook", async (req, res) => {
  try {
    const notification = req.body;

    const status = notification.transaction_status;
    const orderId = notification.order_id;

    if (!orderId) return res.status(400).json({ error: "Missing order id" });

    let paymentStatus = "pending";
    if (["settlement", "capture", "success"].includes(status))
      paymentStatus = "paid";
    else if (status === "expire") paymentStatus = "expired";
    else if (["cancel", "deny", "failure"].includes(status))
      paymentStatus = "failed";

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    res.json({ message: "ok" });
  } catch (err) {
    console.error("webhook error", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// ORDER DETAIL
app.get("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.listen(port, () => {
  console.log("Server running on port", port);
});
