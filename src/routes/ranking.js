const { Router } = require('express');
const c = require('../controllers/ranking');

const router = Router();

router.get('/', c.ranking);

module.exports = router;
