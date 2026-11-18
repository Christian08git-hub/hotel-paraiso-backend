const pool = require('../config/db');

function autorizarRoles(...rolesPermitidos) {
  return async (req, res, next) => {
    if (!req.usuarioId) return res.status(401).json({ mensaje: 'Autenticación requerida' });
    try {
      const [filas] = await pool.execute(
        `SELECT u.activo, r.nombre AS rol FROM usuarios u
         JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
        [req.usuarioId]
      );
      const usuario = filas[0];
      if (!usuario || !usuario.activo) {
        return res.status(401).json({ mensaje: 'Usuario no disponible' });
      }
      if (!rolesPermitidos.includes(usuario.rol)) {
        return res.status(403).json({ mensaje: 'No tiene permisos para esta operación' });
      }
      req.rol = usuario.rol;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = autorizarRoles;
