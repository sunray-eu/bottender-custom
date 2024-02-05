import inquirer from 'inquirer';
import { TelegramClient } from 'messaging-api-telegram';

import getChannelConfig from '../../../../shared/getChannelConfig';
import getWebhookFromNgrok from '../../../../shared/getWebhookFromNgrok';
import { setWebhook } from '../webhook';
import * as log from '../../../../shared/log';

jest.mock('messaging-api-telegram');
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

jest.mock('../../../../shared/getWebhookFromNgrok');
jest.mock('../../../../shared/log');
jest.mock('../../../../shared/getChannelConfig');

const MOCK_FILE_WITH_PLATFORM = {
  channels: {
    telegram: {
      accessToken: '__accessToken__',
    },
    line: {},
  },
};

const setup = (
  { webhook = undefined, ngrokPort = undefined } = {
    webhook: undefined,
    ngrokPort: undefined,
  }
) => ({
  config: null,
  argv: {
    _: [],
    '--webhook': webhook,
    '--ngrok-port': ngrokPort,
  },
});

beforeEach(() => {
  process.exit = jest.fn();

  jest
    .mocked(getChannelConfig)
    .mockReturnValue(MOCK_FILE_WITH_PLATFORM.channels.telegram);

  jest
    .mocked(getWebhookFromNgrok)
    .mockResolvedValue('https://fakeDomain.ngrok.io');

  jest.mocked(inquirer.prompt).mockResolvedValue({ usingNgrok: true });

  jest.mocked(TelegramClient.prototype.setWebhook).mockResolvedValue(true);
});

describe('resolve', () => {
  it('successfully set webhook', async () => {
    const ctx = setup({ webhook: 'http://example.com/webhook' });

    await setWebhook(ctx);

    expect(log.print).toHaveBeenCalledTimes(1);
    expect(jest.mocked(log.print).mock.calls[0][0]).toMatch(/Successfully/);
  });

  it('get ngrok webhook to set up', async () => {
    const ctx = setup();

    await setWebhook(ctx);

    expect(getWebhookFromNgrok).toBeCalledWith('4040');
    expect(log.print).toHaveBeenCalledTimes(1);
    expect(jest.mocked(log.print).mock.calls[0][0]).toMatch(/Successfully/);
  });

  it('set ngrok webhook port', async () => {
    const ctx = setup({ ngrokPort: '5555' });

    await setWebhook(ctx);

    expect(getWebhookFromNgrok).toBeCalledWith('5555');
  });
});

describe('reject', () => {
  it('reject when accessToken not found in config file', async () => {
    const ctx = setup({ webhook: 'http://example.com/webhook' });

    jest.mocked(getChannelConfig).mockReturnValue({});

    await setWebhook(ctx);

    expect(log.error).toBeCalledWith(
      '`accessToken` is not found in the `bottender.config.js` file'
    );
    expect(process.exit).toBeCalled();
  });

  it('reject when telegram return not success', async () => {
    const ctx = setup({ webhook: 'http://example.com/webhook' });

    jest
      .mocked(TelegramClient.prototype.setWebhook)
      .mockRejectedValue(new Error());

    await setWebhook(ctx);

    expect(log.error).toBeCalledWith('Failed to set Telegram webhook');
    expect(process.exit).toBeCalled();
  });
});
