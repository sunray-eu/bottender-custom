import Table from 'cli-table3';
import chalk from 'chalk';
import inquirer from 'inquirer';
import invariant from 'invariant'; // Import inquirer
import { MessengerClient } from 'messaging-api-messenger';

import getChannelConfig from '../../../shared/getChannelConfig';
import getSubArgs from '../sh/utils/getSubArgs';
import getWebhookFromNgrok from '../../../shared/getWebhookFromNgrok';
import { Channel, ErrorResponse } from '../../../types';
import { CliContext } from '../..';
import { bold, error, print, warn } from '../../../shared/log';

const help = (): void => {
  console.log(`
    bottender messenger webhook <command> [option]

    ${chalk.dim('Commands:')}

      set                   Set Messenger webhook.

    ${chalk.dim('Options:')}

      -w, --webhook         Webhook callback URL
      --ngrok-port          ngrok port(default: 4040)

    ${chalk.dim('Examples:')}

    ${chalk.dim('-')} Set Messenger webhook URL

      ${chalk.cyan('$ bottender messenger webhook set -w http://example.com')}

    ${chalk.dim('-')} Use specific ngrok port and access token

      ${chalk.cyan('$ bottender messenger webhook set --ngrok-port 4041')}
  `);
};

export async function setWebhook(ctx: CliContext): Promise<void> {
  const argv = getSubArgs(ctx.argv, {
    '--webhook': String,
    '-w': '--webhook',
    '--ngrok-port': String,
  });

  let webhook = argv['--webhook'];
  const ngrokPort = argv['--ngrok-port'] || '4040';

  try {
    const config = await getChannelConfig({
      channel: Channel.Messenger,
    });

    // Destructuring for clarity
    const {
      accessToken,
      appId,
      appSecret,
      verifyToken,
      pageId,
      path = '/webhooks/messenger',
    } = config as Record<string, string>;

    // Invariant checks
    invariant(
      accessToken,
      '`accessToken` is not found in the `bottender.config.js` file'
    );
    invariant(appId, '`appId` is not found in the `bottender.config.js` file');
    invariant(
      appSecret,
      '`appSecret` is not found in the `bottender.config.js` file'
    );
    invariant(
      verifyToken,
      '`verifyToken` is not found in the `bottender.config.js` file'
    );

    const client = new MessengerClient({
      accessToken,
      appId,
      appSecret,
    });

    if (!webhook) {
      warn('We can not find the webhook callback URL you provided.');
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'usingNgrok',
          message: `Are you using ngrok (get URL from ngrok server on http://127.0.0.1:${ngrokPort})?`,
        },
      ]);
      if (answer.usingNgrok) {
        webhook = `${await getWebhookFromNgrok(ngrokPort)}${path}`;
      }
    }

    invariant(
      webhook,
      '`webhook` is required but not found. Use -w <webhook> to set up or make sure you are running ngrok server.'
    );

    const defaultFields = [
      'messages',
      'messaging_postbacks',
      'messaging_optins',
      'messaging_referrals',
      'messaging_handovers',
      'messaging_policy_enforcement',
    ];

    if (!config.fields) {
      print(
        `\`fields\` is not found in the \`bottender.config.js\` file, we will use ${bold(
          defaultFields.join(', ')
        )} to setup.`
      );
      print(
        'See more on: https://developers.facebook.com/docs/graph-api/reference/app/subscriptions'
      );
    }

    const fields = (config.fields as string[]) || defaultFields;

    const tokenInfo = await client.debugToken();

    invariant(tokenInfo.isValid, 'Page access token is invalid');
    invariant(tokenInfo.type === 'PAGE', 'Access token is not a page token');

    const pageInfo = await client.getPageInfo();

    const table = new Table();

    table.push(
      [chalk.green('Page ID'), pageInfo.id],
      [chalk.green('Page Name'), pageInfo.name],
      [chalk.green('App Name'), tokenInfo.application],
      [
        chalk.green('Token Expires At'),
        tokenInfo.expiresAt === 0
          ? 'Never'
          : new Date(tokenInfo.expiresAt * 1000).toString(),
      ],
      [chalk.green('Token Scopes'), tokenInfo.scopes.join(',')],
      [chalk.green('App Fields'), fields.join(',')],
      [chalk.green('Webhook URL'), webhook]
    );

    console.log(table.toString());

    const confirmSubscription = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure to create subscription with those settings?',
      },
    ]);

    if (!confirmSubscription.confirm) {
      return;
    }

    const { success } = await client.createSubscription({
      object: 'page',
      callbackUrl: webhook as string,
      verifyToken: verifyToken as string,
      fields,
      accessToken: `${appId}|${appSecret}`,
    });

    invariant(success, 'Setting for webhook is failed');

    print('Successfully set Messenger webhook callback URL');

    if (pageId) {
      const { data } = await client.axios.post(
        `/${pageId}/subscribed_apps?access_token=${accessToken}`,
        {
          subscribedFields: fields.join(','),
        }
      );

      invariant(data.success, 'Subscribing app for page is failed');
    }

    print(
      `Check callback URL on: https://developers.facebook.com/apps/${appId}/webhooks/`
    );
    print(
      `Check selected events on: https://developers.facebook.com/apps/${appId}/messenger/`
    );
  } catch (err) {
    error('Failed to set Messenger webhook');
    const errorObj = err as ErrorResponse;

    if (errorObj.response) {
      error(`status: ${bold(errorObj.response.status as string)}`);
      if (errorObj.response.data) {
        error(`data: ${bold(JSON.stringify(errorObj.response.data, null, 2))}`);
      }
    } else {
      warn(errorObj.message as string);
    }

    return process.exit(1);
  }
}

export default async function main(ctx: CliContext): Promise<void> {
  const subcommand = ctx.argv._[2];

  switch (subcommand) {
    // TODO: implement get
    case 'set': {
      await setWebhook(ctx);
      break;
    }
    // TODO: implement delete
    case 'help':
      help();
      break;
    default:
      error(`Please specify a valid subcommand: set`);
      help();
  }
}
