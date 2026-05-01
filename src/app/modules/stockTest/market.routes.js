// routes/market.routes.js
import express from "express";
import { getPrice, getAnalysis } from "./market.controller.js";

const router = express.Router();

router.get("/price", getPrice);
router.post("/analysis", getAnalysis);

export const marketRoutes = router;