function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field wajib belum diisi: ${missing.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = validateRequest;
