import updateNotifier from 'update-notifier';
import { JsonObject } from 'type-fest';
import { Result } from 'arg';
import { camelcase } from '@sunray-eu/messaging-api-common';
import { get } from 'lodash-es';

import pkg from '../../package.json' assert { type: 'json' };
import { error } from '../shared/log';

import getArgs from './providers/sh/utils/getArgs';
import providers from './providers';

type Provider = 'messenger' | 'telegram' | 'line' | 'viber' | 'sh';

export type CliContext = {
  config: null; // FIXME
  argv: Result<{
    '--help': BooleanConstructor;
    '-h': string;
    '--version': BooleanConstructor;
    '-v': string;
  }>;
};

const main = async (argvFrom2: string[]) => {
  let providerName: Provider;
  let subcommand: string;

  updateNotifier({ pkg }).notify({ defer: false });

  const argv = getArgs(
    argvFrom2,
    {
      '--version': Boolean,
      '-v': '--version',
      '--help': Boolean,
      '-h': '--help',
    },
    {
      permissive: true,
    }
  );

  switch (argv._[0]) {
    case 'messenger':
    case 'telegram':
    case 'line':
    case 'viber':
      providerName = argv._[0] as Provider;
      subcommand = argv._[1];
      break;
    default:
      providerName = 'sh';
      subcommand = argv._[0];
  }

  if (argv['--version'] || argv._[0] === 'version') {
    console.log(pkg.version);
    process.exit(0);
  }

  const provider = providers[providerName];

  if (argv['--help']) {
    provider.help();
    process.exit(0);
  }

  // the context object to supply to the providers or the commands
  const ctx: CliContext = {
    config: null, // FIXME
    argv,
  };

  try {
    const method = get(provider, camelcase(subcommand || ''));
    if (method) {
      await (provider as any)[camelcase(subcommand)](ctx);
    } else {
      const subcommands = Array.from(provider.subcommands).join(', ');
      error(`Please specify a valid subcommand: ${subcommands}`);
      provider.help();
    }
  } catch (err) {
    error(`An unexpected error occurred in provider ${subcommand}: ${(err as JsonObject).message}
${(err as JsonObject).stack}`);
  }
};

const handleUnexpected = (err: Error): void => {
  error(`An unexpected error occurred: ${err.message}
${err.stack}`);
  process.exit(1);
};

const handleRejection = (reason: Error | any): void => {
  if (reason) {
    if (reason instanceof Error) {
      handleUnexpected(reason);
    } else {
      error(`An unexpected rejection occurred: ${reason}`);
    }
  } else {
    error('An unexpected empty rejection occurred');
  }
  process.exit(1);
};

process.on('unhandledRejection', handleRejection);
process.on('uncaughtException', handleUnexpected);

main(process.argv.slice(2)).catch(handleUnexpected);
