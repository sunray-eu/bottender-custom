import providers from '..';

jest.mock('../sh');
jest.mock('../messenger');
jest.mock('../telegram');
jest.mock('../line');
jest.mock('../viber');

describe('providers', () => {
  it('should exist', () => {
    expect(providers).toBeDefined();
  });

  it('should return sh', () => {
    const sh = await import('../sh').default;
    expect(providers.sh).toEqual(sh);
  });

  it('should return messenger', () => {
    const messenger = await import('../messenger').default;
    expect(providers.messenger).toEqual(messenger);
  });

  it('should return telegram', () => {
    const telegram = await import('../telegram').default;
    expect(providers.telegram).toEqual(telegram);
  });

  it('should return line', () => {
    const line = await import('../line').default;
    expect(providers.line).toEqual(line);
  });

  it('should return viber', () => {
    const viber = await import('../viber').default;
    expect(providers.viber).toEqual(viber);
  });
});
