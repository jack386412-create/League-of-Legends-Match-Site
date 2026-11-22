const { Router } = require('express');
const c = require('../controllers/teams');
const { requireAdmin } = require('../middlewares/auth');

const router = Router();

router.post('/balance', requireAdmin, c.balanceTeams);

module.exports = router;
