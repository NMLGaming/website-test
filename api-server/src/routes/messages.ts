import { Router, type IRouter } from "express";
import {
  ListMessageSchedulesResponse,
  ScheduleLayoutMessageBody,
  SendLayoutMessageBody,
  SendLayoutMessageResponse,
  ScheduleLayoutMessageResponse,
} from "@workspace/api-zod";
import { listActivity, scheduleMessage, sendNow } from "../lib/message-scheduler";

const router: IRouter = Router();

router.get("/messages/schedules", (_req, res) => {
  res.json(ListMessageSchedulesResponse.parse(listActivity()));
});

router.post("/messages/send", async (req, res) => {
  try {
    const body = SendLayoutMessageBody.parse(req.body);
    const activity = await sendNow(body);
    res.json(SendLayoutMessageResponse.parse(activity));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to send message" });
  }
});

router.post("/messages/schedules", (req, res) => {
  try {
    const body = ScheduleLayoutMessageBody.parse(req.body);
    const activity = scheduleMessage({
      ...body,
      scheduledFor: body.scheduledFor.toISOString(),
    });
    res.status(201).json(ScheduleLayoutMessageResponse.parse(activity));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to schedule message" });
  }
});

export default router;