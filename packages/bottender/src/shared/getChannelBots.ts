import invariant from 'invariant';
import { merge } from 'lodash-es';

import {
  Action,
  Bot,
  BottenderConfig,
  ChannelBot,
  LineConnector,
  MessengerConnector,
  Plugin,
  SlackConnector,
  TelegramConnector,
  ViberConnector,
  WhatsappConnector,
  getSessionStore,
} from '..';

import getBottenderConfig from './getBottenderConfig';
import {
  getEntryFunctionFromGlobals,
  getErrorHanlderFromGlobals,
} from './getGlobalVars';

let channelBots: ChannelBot[] = [];

export function cleanChannelBots(): void {
  channelBots = [];
}

async function getChannelBots(): Promise<ChannelBot[]> {
  if (channelBots.length > 0) {
    return channelBots;
  }

  const bottenderConfig = await getBottenderConfig();

  const {
    initialState,
    plugins,
    channels = {},
  } = merge(bottenderConfig /* , config */) as BottenderConfig;

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

  channelBots = Object.entries(channels)
    .filter(([, { enabled }]) => enabled)
    .map(
      ([
        channel,
        {
          path: webhookPath,
          timer,
          sync,
          onRequest,
          connector,
          ...connectorConfig
        },
      ]) => {
        let channelConnector;
        if (
          [
            'messenger',
            'line',
            'telegram',
            'slack',
            'viber',
            'whatsapp',
          ].includes(channel)
        ) {
          switch (channel) {
            case 'messenger':
              channelConnector = new MessengerConnector(connectorConfig);
              break;
            case 'line':
              channelConnector = new LineConnector(connectorConfig);
              break;
            case 'telegram':
              channelConnector = new TelegramConnector(connectorConfig);
              break;
            case 'slack':
              channelConnector = new SlackConnector(connectorConfig);
              break;
            case 'viber':
              channelConnector = new ViberConnector(connectorConfig);
              break;
            case 'whatsapp':
              channelConnector = new WhatsappConnector(connectorConfig);
              break;

            default:
              break;
          }
        } else {
          invariant(connector, `The connector of ${channel} is missing.`);
          channelConnector = connector;
        }

        const channelBot = new Bot({
          sessionStore,
          sync,
          onRequest,
          connector: channelConnector,
          timerConfig: timer,
        }) as Bot<any, any, any, any>;

        initializeBot(channelBot);

        return {
          webhookPath: webhookPath || `/webhooks/${channel}`,
          bot: channelBot,
        };
      }
    );

  return channelBots;
}

export default getChannelBots;
