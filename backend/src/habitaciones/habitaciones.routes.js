const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const autorizarRoles = require('../middlewares/autorizarRoles');
const controller = require('./habitaciones.controller');

const router = express.Router();
router.use(verificarToken, autorizarRoles('admin'));
router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.desactivar);
module.exports = router;