import bodyParser from 'body-parser';
import express from 'express';
import { bottender } from '@sunray-eu/bottender';

const app = bottender({
  dev: process.env.NODE_ENV !== 'production',
});

const port = Number(process.env.PORT) || 5000;

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.use(
    bodyParser.json({
      verify: (req, _, buf) => {
        if ('rawBody' in req) {
          req.rawBody = buf.toString();
        }
      },
    })
  );

  server.get('/api', (req, res) => {
    res.json({ ok: true });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
