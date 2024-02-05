import isEmpty from 'lodash/isEmpty';
import { NextFunction, Request, Response } from 'express';

import { IBot } from './types';

function createMiddleware(bot: IBot) {
  const requestHandler = bot.createRequestHandler();

  const wrapper =
    (fn: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch((err: Error) => next(err));

  return wrapper(async (req: Request, res: Response) => {
    if (isEmpty(req.query) && !req.body) {
      throw new Error(
        'createMiddleware(): Missing query and body, you may need a body parser. Use `body-parser` or other similar package before this middleware.'
      );
    }
    const response = await requestHandler(
      {
        ...req.query,
        ...req.body,
      },
      {
        method: req.method,
        path: req.path,
        query: req.query as Record<string, string>,
        headers: req.headers,
        rawBody: req.body,
        body: req.body,
        params: req.params,
        url: req.url,
      }
    );
    if (response) {
      res.set(response.headers || {});
      res.status(
        (typeof response.status === 'number' && response.status) || 200
      );
      res.send(response.body || '');
    } else {
      res.status(200);
      res.send('');
    }
  });
}

export default createMiddleware;
