import { TelegramClient } from '@sunray-eu/messaging-api-telegram';

import getChannelConfig from '../../../../shared/getChannelConfig';
import { deleteWebhook } from '../webhook';
import * as log from '../../../../shared/log';

jest.mock('messaging-api-telegram');
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

beforeEach(() => {
  process.exit = jest.fn();

  jest
    .mocked(getChannelConfig)
    .mockReturnValue(MOCK_FILE_WITH_PLATFORM.channels.telegram);
});

describe('resolve', () => {
  it('successfully delete webhook', async () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };

    jest.mocked(TelegramClient.prototype.deleteWebhook).mockResolvedValue(true);

    await deleteWebhook(ctx);

    expect(log.print).toHaveBeenCalledTimes(1);
    expect(jest.mocked(log.print).mock.calls[0][0]).toMatch(/Successfully/);
  });
});

describe('reject', () => {
  it('reject when Telegram return not success', () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };

    jest
      .mocked(TelegramClient.prototype.deleteWebhook)
      .mockResolvedValue(false);

    expect(deleteWebhook(ctx).then).toThrow();
  });

  it('reject when `accessToken` is not found in the `bottender.config.js` file', () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };

    jest.mocked(getChannelConfig).mockReturnValueOnce({});

    expect(deleteWebhook(ctx).then).toThrow();
  });
});
