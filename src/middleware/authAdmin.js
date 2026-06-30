const ApiError = require('../utils/ApiError');
const supabaseAdmin = require('../utils/supabaseAdmin');

async function authAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Token tidak ditemukan, silakan login dulu');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      throw new ApiError(401, 'Token tidak valid atau sudah expired');
    }

    req.admin = data.user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authAdmin;
