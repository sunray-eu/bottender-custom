import { Context } from '@sunray-eu/bottender';

class BrowserContext extends Context {
  sendText(text) {
    this._client.sendText(text);
  }
}

export default BrowserContext;
