import inquirer from 'inquirer';
import invariant from 'invariant'; // Use inquirer
import { TelegramClient } from 'messaging-api-telegram';

import getChannelConfig from '../../../shared/getChannelConfig';
import getSubArgs from '../sh/utils/getSubArgs';
import getWebhookFromNgrok from '../../../shared/getWebhookFromNgrok';
import { Channel, ErrorResponse } from '../../../types';
import { CliContext } from '../..';
import { bold, error, print, warn } from '../../../shared/log';

import help from './help';

export async function getWebhook(_: CliContext): Promise<void> {
  try {
    const config = await getChannelConfig({ channel: Channel.Telegram });

    const { accessToken } = config as { accessToken: string };

    invariant(
      accessToken,
      '`accessToken` is not found in the `bottender.config.js` file'
    );

    const client = new TelegramClient({
      accessToken,
    });

    const result = await client.getWebhookInfo();

    Object.entries(result).forEach(([key, value]) => print(`${key}: ${value}`));
  } catch (err) {
    error('Failed to get Telegram webhook');

    const errObj = err as ErrorResponse;

    if (errObj.response) {
      error(`status: ${bold(errObj.response.status as string)}`);
      if (errObj.response.data) {
        error(`data: ${bold(JSON.stringify(errObj.response.data, null, 2))}`);
      }
    } else {
      error(errObj.message as string);
    }

    return process.exit(1);
  }
}

export async function setWebhook(ctx: CliContext): Promise<void> {
  const argv = getSubArgs(ctx.argv, {
    '--webhook': String,
    '-w': '--webhook',
    '--ngrok-port': String,
  });

  const ngrokPort = argv['--ngrok-port'] || '4040';
  let webhook = argv['--webhook'];

  try {
    const config = await getChannelConfig({ channel: Channel.Telegram });

    const { accessToken, path = '/webhooks/telegram' } = config as {
      accessToken: string;
      path: string;
    };

    invariant(
      accessToken,
      '`accessToken` is not found in the `bottender.config.js` file'
    );

    const client = new TelegramClient({ accessToken });

    if (!webhook) {
      warn('We can not find the webhook callback URL you provided.');
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'usingNgrok',
          message: `Are you using ngrok (get URL from ngrok server on http://127.0.0.1:${ngrokPort})?`,
        },
      ]);
      if (answers.usingNgrok) {
        webhook = `${await getWebhookFromNgrok(ngrokPort)}${path}`;
      }
    }

    invariant(
      webhook,
      '`webhook` is required but not found. Use -w <webhook> to set up or make sure you are running ngrok server.'
    );

    await client.setWebhook(webhook as string);

    print('Successfully set Telegram webhook callback URL');
  } catch (err) {
    error('Failed to set Telegram webhook');
    const errObj = err as ErrorResponse;

    if (errObj.response) {
      error(`status: ${bold(errObj.response.status as string)}`);
      if (errObj.response.data) {
        error(`data: ${bold(JSON.stringify(errObj.response.data, null, 2))}`);
      }
    } else {
      error(errObj.message as string);
    }

    return process.exit(1);
  }
}

export async function deleteWebhook(_: CliContext): Promise<void> {
  try {
    const config = await getChannelConfig({ channel: Channel.Telegram });

    const { accessToken } = config as { accessToken: string };

    invariant(
      accessToken,
      '`accessToken` is not found in the `bottender.config.js` file'
    );

    const client = new TelegramClient({
      accessToken,
    });

    await client.deleteWebhook();

    print('Successfully delete Telegram webhook');
  } catch (err) {
    error('Failed to delete Telegram webhook');
    const errObj = err as ErrorResponse;

    if (errObj.response) {
      error(`status: ${bold(errObj.response.status as string)}`);
      if (errObj.response.data) {
        error(`data: ${bold(JSON.stringify(errObj.response.data, null, 2))}`);
      }
    } else {
      error(errObj.message as string);
    }

    return process.exit(1);
  }
}

export default async function main(ctx: CliContext): Promise<void> {
  const subcommand = ctx.argv._[2];

  switch (subcommand) {
    case 'get':
      await getWebhook(ctx);
      break;
    case 'set':
      await setWebhook(ctx);
      break;
    case 'delete':
    case 'del':
      await deleteWebhook(ctx);
      break;
    default:
      error(`Please specify a valid subcommand: get, set, delete`);
      help();
  }
}
