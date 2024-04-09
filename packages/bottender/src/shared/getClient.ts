import { LineClient } from '@sunray-eu/messaging-api-line';
import { MessengerClient } from '@sunray-eu/messaging-api-messenger';
import { SlackOAuthClient } from '@sunray-eu/messaging-api-slack';
import { TelegramClient } from '@sunray-eu/messaging-api-telegram';
import { ViberClient } from '@sunray-eu/messaging-api-viber';

import LineBot from '../line/LineBot';
import MessengerBot from '../messenger/MessengerBot';
import SlackBot from '../slack/SlackBot';
import TelegramBot from '../telegram/TelegramBot';
import TwilioClient from '../whatsapp/TwilioClient';
import ViberBot from '../viber/ViberBot';
import WhatsappBot from '../whatsapp/WhatsappBot';
import { Channel } from '../types';

import getBottenderConfig from './getBottenderConfig';
import getSessionStore from './getSessionStore';

const BOT_MAP = {
  messenger: MessengerBot,
  line: LineBot,
  slack: SlackBot,
  telegram: TelegramBot,
  viber: ViberBot,
  whatsapp: WhatsappBot,
};

async function getClient<C extends string>(
  channel: C
): Promise<
  | Awaited<
      C extends 'messenger'
        ? MessengerClient
        : C extends 'line'
          ? LineClient
          : C extends 'slack'
            ? SlackOAuthClient
            : C extends 'telegram'
              ? TelegramClient
              : C extends 'viber'
                ? ViberClient
                : C extends 'whatsapp'
                  ? TwilioClient
                  : any
    >
  | undefined
> {
  const { channels = {} } = await getBottenderConfig();
  const sessionStore = getSessionStore();

  const channelConfig = (channels as Record<string, any>)[channel];

  if (!channelConfig) {
    throw new Error(
      `getClient: ${channel} config is missing in \`bottender.config.js\`.`
    );
  }
  if (!(channel in BOT_MAP)) {
    if (!('connector' in channelConfig)) {
      return undefined;
    }

    return channelConfig.connector.client;
  }

  const ChannelBot = BOT_MAP[channel as Channel];

  const channelBot = new ChannelBot({
    ...channelConfig,
    sessionStore,
  } as any);

  return channelBot.connector.client as any;
}

export default getClient;
