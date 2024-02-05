import bodyParser from 'body-parser';
import express from 'express';

import registerRoutes from './registerRoutes';
import { InstanceOfIBot, RouteConfig } from './types';

function createServer<T>(bot: InstanceOfIBot<T>, config: RouteConfig = {}) {
  const server = express();

  server.use(
    bodyParser.urlencoded({
      extended: false,
      verify: (req: express.Request & { rawBody?: string }, _, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  server.use(
    bodyParser.json({
      verify: (req: express.Request & { rawBody?: string }, _, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  registerRoutes(server, bot, config);

  return server;
}

export default createServer;
