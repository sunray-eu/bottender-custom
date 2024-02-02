import messenger from '..';

jest.mock('../profile');
jest.mock('../webhook');
jest.mock('../help');
jest.mock('../persona');

describe('messenger cli', () => {
  it('should exist', () => {
    expect(messenger).toBeDefined();
  });

  it('should return profile module', () => {
    const profile = await import('../profile').default;
    expect(messenger.profile).toEqual(profile);
  });

  it('should return webhook module', () => {
    const webhook = await import('../webhook').default;
    expect(messenger.webhook).toEqual(webhook);
  });

  it('should return help module', () => {
    const help = await import('../help').default;
    expect(messenger.help).toEqual(help);
  });

  it('should return persona module', () => {
    const persona = await import('../persona').default;
    expect(messenger.persona).toEqual(persona);
  });
});
