const { Router } = require('express');
const c = require('../controllers/players');
const { requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/', c.list);
router.get('/:id', c.detail);
router.post('/', requireAdmin, c.create);
router.patch('/:id', requireAdmin, c.update);
router.delete('/:id', requireAdmin, c.remove);

module.exports = router;
