import { MessengerClient } from '@sunray-eu/messaging-api-messenger';

import getChannelConfig from '../../../../shared/getChannelConfig';
import { deleteMessengerProfile } from '../profile';
import * as log from '../../../../shared/log';

jest.mock('messaging-api-messenger');

jest.mock('../../../../shared/log');
jest.mock('../../../../shared/getChannelConfig');

const MOCK_FILE_WITH_PLATFORM = {
  channels: {
    messenger: {
      accessToken: '__FAKE_TOKEN__',
    },
  },
};

beforeEach(() => {
  process.exit = jest.fn();

  jest
    .mocked(getChannelConfig)
    .mockReturnValue(MOCK_FILE_WITH_PLATFORM.channels.messenger);
});

describe('resolved', () => {
  it('call deleteMessengerProfile', async () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };

    jest
      .mocked(MessengerClient.prototype.deleteMessengerProfile)
      .mockResolvedValue({});

    await deleteMessengerProfile(ctx);

    const client = jest.mocked(MessengerClient).mock.instances[0];

    expect(client.deleteMessengerProfile).toBeCalledWith([
      'account_linking_url',
      'persistent_menu',
      'get_started',
      'greeting',
      'ice_breakers',
      'whitelisted_domains',
    ]);
  });
});

describe('reject', () => {
  it('handle error thrown with only status', async () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };
    const error = {
      response: {
        status: 400,
      },
    };
    jest
      .mocked(MessengerClient.prototype.deleteMessengerProfile)
      .mockRejectedValue(error);

    await deleteMessengerProfile(ctx);

    expect(log.error).toBeCalled();
    expect(process.exit).toBeCalled();
  });

  it('handle error thrown by messenger', async () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            message: '(#100) ...',
            type: 'OAuthException',
            code: 100,
            error_subcode: 2018145,
            fbtrace_id: 'HXd3kIOXLsK',
          },
        },
      },
    };
    jest
      .mocked(MessengerClient.prototype.deleteMessengerProfile)
      .mockRejectedValue(error);

    await deleteMessengerProfile(ctx);

    expect(log.error).toBeCalled();
    expect(jest.mocked(log.error).mock.calls[2][0]).not.toMatch(
      /\[object Object\]/
    );
    expect(process.exit).toBeCalled();
  });

  it('handle error thrown by ourselves', async () => {
    const ctx = {
      config: null,
      argv: {
        _: [],
      },
    };
    jest
      .mocked(MessengerClient.prototype.deleteMessengerProfile)
      .mockRejectedValue(new Error('something wrong happened'));

    await deleteMessengerProfile(ctx);

    expect(log.error).toBeCalled();
    expect(process.exit).toBeCalled();
  });
});
