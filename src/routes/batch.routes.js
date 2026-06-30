const express = require("express");
const router = express.Router();
const batchController = require("../controllers/batch.controller");
const authAdmin = require("../middleware/authAdmin");
const validateRequest = require("../middleware/validateRequest");

// Public
router.get("/", batchController.listActiveBatches);
router.get("/admin/all", authAdmin, batchController.listAllBatches);
router.get("/:slug", batchController.getBatch);

// Admin only
router.post(
  "/",
  authAdmin,
  validateRequest(["name", "slug", "dpDeadline"]),
  batchController.createBatch,
);
router.patch(
  "/:id/status",
  authAdmin,
  validateRequest(["status"]),
  batchController.updateBatchStatus,
);

module.exports = router;
