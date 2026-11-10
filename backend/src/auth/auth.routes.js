import express from "express";
import { registro } from "./auth.controller.js";


const router = express.Router();
router.post("/registro", registro);

export default router;