import chain from '../chain';
import withProps from '../withProps';
import { run } from '../bot/Bot';

function setup() {
  const context = {
    sendText: jest.fn(),
  };

  return {
    context,
  };
}

it('should not call sendText if First action return undefined', async () => {
  const { context } = setup();

  function First(_ctx: any, { _next }: any) {} // eslint-disable-line @typescript-eslint/no-empty-function
  function Second(_ctx: any, { _next }: any) {} // eslint-disable-line @typescript-eslint/no-empty-function

  const Chain = chain([First, Second]);

  await run(Chain)(context);

  expect(context.sendText).not.toBeCalled();
});

it('should call sendText with hi if first action return SayHi', async () => {
  const { context } = setup();

  async function SayHi(ctx: { sendText: (arg0: string) => any }) {
    await ctx.sendText('hi');
  }
  function First(_ctx: any, { _next }: any) {
    return SayHi;
  }
  function Second(_ctx: any, { _next }: any) {} // eslint-disable-line @typescript-eslint/no-empty-function

  const Chain = chain([First, Second]);

  await run(Chain)(context);

  expect(context.sendText).toBeCalledWith('hi');
});

it('should call sendText with hi if second action return SayHi', async () => {
  const { context } = setup();

  async function SayHi(ctx: { sendText: (arg0: string) => any }) {
    await ctx.sendText('hi');
  }
  function First(_ctx: any, { next }: any) {
    return next;
  }
  function Second(_ctx: any, { next }: any) {
    return SayHi;
  }

  const Chain = chain([First, Second]);

  await run(Chain)(context);

  expect(context.sendText).toBeCalledWith('hi');
});

it('should call sendText with hi if second action return next', async () => {
  const { context } = setup();

  async function SayHi(ctx: { sendText: (arg0: string) => any }) {
    await ctx.sendText('hi');
  }
  function First(_ctx: any, { next }: any) {
    return next;
  }
  function Second(_ctx: any, { next }: any) {
    return next;
  }

  const Chain = chain([First, Second]);

  await run(withProps(Chain, { next: SayHi }))(context);

  expect(context.sendText).toBeCalledWith('hi');
});
