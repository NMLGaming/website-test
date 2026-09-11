import { randomUUID } from "node:crypto";
import { discordBot } from "./discord-bot";
import { logger } from "./logger";

export type ActivityStatus = "sent" | "scheduled" | "failed";

export type MessageActivity = {
  id: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  status: ActivityStatus;
  scheduledFor: string | null;
  createdAt: string;
  previewTitle: string;
};

type StoredMessage = {
  activity: MessageActivity;
  layout: Record<string, unknown>;
  timer?: NodeJS.Timeout;
};

const activityStore: StoredMessage[] = [];

function previewTitle(layout: Record<string, unknown>) {
  const components = Array.isArray(layout.components) ? layout.components : [];
  const firstText = components.find(
    (component) =>
      component &&
      typeof component === "object" &&
      "content" in component &&
      typeof component.content === "string",
  ) as { content: string } | undefined;

  return firstText?.content.split("\n")[0]?.slice(0, 80) || "Untitled LayoutView";
}

export function listActivity() {
  return activityStore.slice(0, 50).map(({ activity }) => activity);
}

export function sendNow(input: {
  guildId: string;
  channelId: string;
  layout: Record<string, unknown>;
}) {
  const activity: MessageActivity = {
    id: randomUUID(),
    guildId: input.guildId,
    guildName: discordBot.getGuildName(input.guildId),
    channelId: input.channelId,
    channelName: discordBot.getChannelName(input.guildId, input.channelId),
    status: "sent",
    scheduledFor: null,
    createdAt: new Date().toISOString(),
    previewTitle: previewTitle(input.layout),
  };

  return discordBot.sendLayout(input.channelId, input.layout)
    .then(() => {
      activityStore.unshift({ activity, layout: input.layout });
      return activity;
    })
    .catch((error) => {
      activity.status = "failed";
      activityStore.unshift({ activity, layout: input.layout });
      throw error;
    });
}

export function scheduleMessage(input: {
  guildId: string;
  channelId: string;
  layout: Record<string, unknown>;
  scheduledFor: string;
}) {
  const scheduledAt = Date.parse(input.scheduledFor);
  if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
    throw new Error("scheduledFor must be a future date");
  }

  const activity: MessageActivity = {
    id: randomUUID(),
    guildId: input.guildId,
    guildName: discordBot.getGuildName(input.guildId),
    channelId: input.channelId,
    channelName: discordBot.getChannelName(input.guildId, input.channelId),
    status: "scheduled",
    scheduledFor: new Date(scheduledAt).toISOString(),
    createdAt: new Date().toISOString(),
    previewTitle: previewTitle(input.layout),
  };

  const stored: StoredMessage = { activity, layout: input.layout };
  stored.timer = setTimeout(() => {
    void discordBot.sendLayout(input.channelId, input.layout)
      .then(() => {
        activity.status = "sent";
        logger.info({ activityId: activity.id }, "Scheduled LayoutView sent");
      })
      .catch((error) => {
        activity.status = "failed";
        logger.error({ err: error, activityId: activity.id }, "Scheduled LayoutView failed");
      });
  }, scheduledAt - Date.now());

  activityStore.unshift(stored);
  return activity;
}