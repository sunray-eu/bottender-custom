import DevServer from './server/DevServer';
import Server, { ServerOptions } from './server/Server';

type BottenderServerOptions = ServerOptions & {
  /**
   * Whether to launch Bottender in dev mode - @default false
   */
  dev?: boolean;
};

function bottender(options: BottenderServerOptions): Server {
  if (options.dev) {
    return new DevServer(options);
  }

  return new Server(options);
}

export default bottender;
