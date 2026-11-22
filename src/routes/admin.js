const { Router } = require('express');
const c = require('../controllers/admin');
const { requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/backup', requireAdmin, c.backup);

module.exports = router;
