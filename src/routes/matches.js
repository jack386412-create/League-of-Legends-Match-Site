const { Router } = require('express');
const c = require('../controllers/matches');
const { requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/', c.list);
router.get('/:id', c.detail);
router.post('/', requireAdmin, c.create);
router.patch('/:id/result', requireAdmin, c.setResult);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
