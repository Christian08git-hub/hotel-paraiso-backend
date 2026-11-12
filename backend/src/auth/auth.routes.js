import express from "express";
import { registro, login, obtenerPerfil } from "./auth.controller.js";
import verificarToken from "../middlewares/verificarToken.js";

const router = express.Router();

router.post("/registro", registro);
router.post("/login", login);

// Ruta protegida: requiere un JWT válido
router.get("/me", verificarToken, obtenerPerfil);

export default router;