import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import messagesRouter from "./messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(messagesRouter);

export default router;
