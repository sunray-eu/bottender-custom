import express from 'express';
import { createServer, registerRoutes } from '@bottender/express';
import { merge } from 'lodash-es';

import Bot from './bot/Bot';
import ConsoleBot from './console/ConsoleBot';
import LineBot from './line/LineBot';
import MessengerBot from './messenger/MessengerBot';
import SlackBot from './slack/SlackBot';
import TelegramBot from './telegram/TelegramBot';
import ViberBot from './viber/ViberBot';
import WhatsappBot from './whatsapp/WhatsappBot';
import getBottenderConfig from './shared/getBottenderConfig';
import getSessionStore from './shared/getSessionStore';
import { Action, BottenderConfig, Channel, Plugin } from './types';
import {
  getEntryFunctionFromGlobals,
  getErrorHanlderFromGlobals,
} from './shared/getGlobalVars';

const BOT_MAP = {
  messenger: MessengerBot,
  line: LineBot,
  slack: SlackBot,
  telegram: TelegramBot,
  viber: ViberBot,
  whatsapp: WhatsappBot,
};

async function initializeServer({
  isConsole,
  config,
}: {
  isConsole?: boolean;
  config?: BottenderConfig;
} = {}): Promise<void | express.Application> {
  const bottenderConfig = await getBottenderConfig();

  const { initialState, plugins, channels } = merge(bottenderConfig, config);

  const sessionStore = await getSessionStore();

  // TODO: refine handler entry, improve error message and hint
  // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
  const Entry: Action<any, any> = getEntryFunctionFromGlobals();

  let ErrorEntry: Action<any, any>;
  try {
    // eslint-disable-next-line import/no-dynamic-require
    ErrorEntry = getErrorHanlderFromGlobals();
  } catch (err) {} // eslint-disable-line no-empty

  function initializeBot(bot: Bot<any, any, any, any>): void {
    if (initialState) {
      bot.setInitialState(initialState);
    }

    if (plugins) {
      plugins.forEach((plugin: Plugin<any>) => {
        bot.use(plugin);
      });
    }

    bot.onEvent(Entry);
    if (ErrorEntry) {
      bot.onError(ErrorEntry);
    }
  }

  if (isConsole) {
    const bot = new ConsoleBot({
      fallbackMethods: true,
      sessionStore,
    });

    initializeBot(bot);

    bot.createRuntime();
  } else {
    let server: express.Application | undefined;

    Object.entries(channels || {})
      .filter(([, { enabled }]) => enabled)
      .map(([channel, { path: webhookPath, ...channelConfig }]) => {
        const ChannelBot = BOT_MAP[channel as Channel];
        const channelBot = new ChannelBot({
          ...channelConfig,
          sessionStore,
        } as any);

        initializeBot(channelBot);

        return { channel, webhookPath, bot: channelBot };
      })
      .forEach(({ channel, webhookPath, bot }) => {
        const routePath = webhookPath || `/webhooks/${channel}`;
        if (server) {
          registerRoutes<typeof bot>(server, bot, { path: routePath });
        } else {
          server = createServer<typeof bot>(bot, {
            path: routePath,
          });
        }
      });

    return server;
  }
}

export default initializeServer;
