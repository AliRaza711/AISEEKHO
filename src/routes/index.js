const express = require('express');
const { ExampleController } = require('../controllers');

const router = express.Router();

router.get('/', ExampleController.getHelloWorld);

module.exports = router;
