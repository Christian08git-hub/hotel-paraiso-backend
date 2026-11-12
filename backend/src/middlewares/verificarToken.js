
import jwt from "jsonwebtoken";

export default function verificarToken(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? "").split(" ");

  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET no está configurada");
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    // El service firma el token con subject = id del usuario
    req.usuario = { id: payload.sub, rol: payload.rol };
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}