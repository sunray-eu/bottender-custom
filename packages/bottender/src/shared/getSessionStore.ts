import warning from 'warning';

import FileSessionStore from '../session/FileSessionStore';
import MemorySessionStore from '../session/MemorySessionStore';
import MongoSessionStore from '../session/MongoSessionStore';
import RedisSessionStore from '../session/RedisSessionStore';
import SessionStore from '../session/SessionStore';
import { SessionConfig, SessionDriver } from '../types';

import getBottenderConfig from './getBottenderConfig';

async function getSessionStore(): Promise<SessionStore> {
  const config = await getBottenderConfig();

  const sessionConfig = config.session as SessionConfig;
  const { driver, expiresIn, store } = sessionConfig;

  switch (driver) {
    case SessionDriver.Memory:
      return new MemorySessionStore(store.memory, expiresIn);
    case SessionDriver.File:
      return new FileSessionStore(store || {}, expiresIn);
    case SessionDriver.Mongo:
      return new MongoSessionStore(store || {}, expiresIn);
    case SessionDriver.Redis:
      return new RedisSessionStore(store || {}, expiresIn);
    default:
      warning(
        false,
        `Received unknown driver: ${driver}, fallback to 'memory' driver.`
      );
      return new MemorySessionStore(undefined, expiresIn);
  }
}

export default getSessionStore;
