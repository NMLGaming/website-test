import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";
import { logger } from "./logger";

type LayoutPayload = Record<string, unknown>;

type BotSnapshot = {
  connected: boolean;
  username: string | null;
  tag: string | null;
  guildCount: number;
  lastConnectedAt: string | null;
};

class DiscordBotManager {
  private client: Client | null = null;
  private lastConnectedAt: string | null = null;

  async connect(token: string): Promise<BotSnapshot> {
    await this.disconnect();

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        client.off(Events.Error, onError);
        resolve();
      };
      const onError = (error: Error) => {
        client.off(Events.ClientReady, onReady);
        reject(error);
      };

      client.once(Events.ClientReady, onReady);
      client.once(Events.Error, onError);
      void client.login(token).catch(onError);
    }).catch((error) => {
      client.destroy();
      throw error;
    });

    this.client = client;
    this.lastConnectedAt = new Date().toISOString();
    logger.info({ guildCount: client.guilds.cache.size }, "Discord bot connected");
    return this.getStatus();
  }

  async disconnect(): Promise<BotSnapshot> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      logger.info("Discord bot disconnected");
    }
    return this.getStatus();
  }

  getStatus(): BotSnapshot {
    const user = this.client?.user;
    return {
      connected: Boolean(user),
      username: user?.username ?? null,
      tag: user?.tag ?? null,
      guildCount: this.client?.guilds.cache.size ?? 0,
      lastConnectedAt: this.lastConnectedAt,
    };
  }

  listGuilds() {
    if (!this.client?.user) {
      throw new Error("Bot is not connected");
    }

    return [...this.client.guilds.cache.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ extension: "png", size: 64 }),
        channelCount: guild.channels.cache.filter((channel) =>
          this.isSendableChannel(channel),
        ).size,
      }));
  }

  listChannels(guildId: string) {
    const guild = this.client?.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    return [...guild.channels.cache.values()]
      .filter((channel) => this.isSendableChannel(channel))
      .sort(
        (a, b) =>
          ((a as { position?: number }).position ?? 0) -
          ((b as { position?: number }).position ?? 0),
      )
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type === ChannelType.GuildAnnouncement ? "announcement" : "text",
        position: (channel as { position?: number }).position ?? 0,
      }));
  }

  async sendLayout(channelId: string, layout: LayoutPayload) {
    if (!this.client?.user) {
      throw new Error("Bot is not connected");
    }

    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !this.isSendableChannel(channel)) {
      throw new Error("Channel is not a text or announcement channel");
    }

    const components = layout.components;
    if (!Array.isArray(components) || components.length === 0) {
      throw new Error("LayoutView must contain a non-empty components array");
    }

    return (channel as unknown as { send: (payload: unknown) => Promise<unknown> }).send({
      components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    } as never);
  }

  getGuildName(guildId: string) {
    return this.client?.guilds.cache.get(guildId)?.name ?? "Unknown server";
  }

  getChannelName(guildId: string, channelId: string) {
    return (
      this.client?.guilds.cache.get(guildId)?.channels.cache.get(channelId)
        ?.name ?? "Unknown channel"
    );
  }

  private isSendableChannel(channel: {
    type: ChannelType;
    isTextBased: () => boolean;
    isDMBased?: () => boolean;
  }) {
    return (
      channel.isTextBased() &&
      !channel.isDMBased?.() &&
      (channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement)
    );
  }
}

export const discordBot = new DiscordBotManager();