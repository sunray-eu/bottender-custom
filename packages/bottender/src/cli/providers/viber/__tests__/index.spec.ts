import sh from '..';

jest.mock('../webhook');
jest.mock('../help');

describe('telegram cli', () => {
  it('should exist', () => {
    expect(sh).toBeDefined();
  });

  it('should return webhook module', () => {
    const webhook = await import('../webhook').default;
    expect(sh.webhook).toEqual(webhook);
  });

  it('should return help module', () => {
    const help = await import('../help').default;
    expect(sh.help).toEqual(help);
  });
});
