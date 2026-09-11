import { Router, type IRouter } from "express";
import {
  ConnectBotBody,
  GetBotStatusResponse,
  ListBotGuildsResponse,
  ListGuildChannelsParams,
  ListGuildChannelsResponse,
} from "@workspace/api-zod";
import { discordBot } from "../lib/discord-bot";

const router: IRouter = Router();

router.get("/bot/status", (_req, res) => {
  res.json(GetBotStatusResponse.parse(discordBot.getStatus()));
});

router.post("/bot/connect", async (req, res) => {
  try {
    const { token } = ConnectBotBody.parse(req.body);
    const status = await discordBot.connect(token);
    res.json(GetBotStatusResponse.parse(status));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to connect bot" });
  }
});

router.post("/bot/disconnect", async (_req, res) => {
  const status = await discordBot.disconnect();
  res.json(GetBotStatusResponse.parse(status));
});

router.get("/bot/guilds", (_req, res) => {
  try {
    res.json(ListBotGuildsResponse.parse(discordBot.listGuilds()));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Bot is not connected" });
  }
});

router.get("/bot/guilds/:guildId/channels", (req, res) => {
  try {
    const { guildId } = ListGuildChannelsParams.parse(req.params);
    res.json(ListGuildChannelsResponse.parse(discordBot.listChannels(guildId)));
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Guild not found" });
  }
});

export default router;