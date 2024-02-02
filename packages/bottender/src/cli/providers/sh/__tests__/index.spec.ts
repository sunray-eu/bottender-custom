import sh from '..';

jest.mock('../init');
jest.mock('../help');
jest.mock('../start');
jest.mock('../dev');

describe('sh cli', () => {
  it('should exist', () => {
    expect(sh).toBeDefined();
  });

  it('should return init module', () => {
    const init = await import('../init').default;
    expect(sh.init).toEqual(init);
  });

  it('should return help module', () => {
    const help = await import('../help').default;
    expect(sh.help).toEqual(help);
  });

  it('should return start module', () => {
    const start = await import('../start').default;
    expect(sh.start).toEqual(start);
  });

  it('should return dev module', () => {
    const dev = await import('../dev').default;
    expect(sh.dev).toEqual(dev);
  });
});
