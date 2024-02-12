import { EventEmitter } from 'events';

import { JsonObject } from 'type-fest';

import Session from '../session/Session';
import { Event } from '../context/Event';
import { RequestContext } from '../types';

// Define the preprocess function response structure
interface PreprocessResponse {
  shouldNext: boolean;
  response?: {
    status: number;
    body: Record<string, unknown> | string;
  };
}

export interface Connector<B, C> {
  client?: C;
  platform: string;
  getUniqueSessionKey(
    bodyOrEvent: B | Event<any>,
    requestContext?: RequestContext
  ): Promise<string | null>;
  updateSession(session: Session, bodyOrEvent: B | Event<any>): Promise<void>;
  mapRequestToEvents(body: B): Event<any>[];
  createContext(params: {
    event: Event<any>;
    session?: Session | null;
    initialState?: JsonObject | null;
    requestContext?: RequestContext;
    emitter?: EventEmitter | null;
  }): any;
  preprocess(
    context: RequestContext
  ): Promise<PreprocessResponse> | PreprocessResponse;
}
