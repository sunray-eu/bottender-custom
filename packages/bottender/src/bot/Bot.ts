import { EventEmitter } from 'events';

import debug from 'debug';
import invariant from 'invariant';
import pMap from 'p-map';
import { JsonObject, JsonValue } from 'type-fest';
import { PlainObject, camelcaseKeysDeep } from 'messaging-api-common';

import CacheBasedSessionStore from '../session/CacheBasedSessionStore';
import Context, { Response } from '../context/Context';
import MemoryCacheStore from '../cache/MemoryCacheStore';
import Session from '../session/Session';
import SessionStore from '../session/SessionStore';
import {
  Action,
  Client,
  IBot,
  Plugin,
  Props,
  RequestContext,
  RequestHandler,
  TimerMode,
  TimerOptions,
} from '../types';
import { Event } from '../context/Event';

import { Connector } from './Connector';

type Builder<C extends Context> = {
  build: () => Action<C>;
};

const debugRequest = debug('bottender:request');
const debugResponse = debug('bottender:response');
const debugSessionRead = debug('bottender:session:read');
const debugSessionWrite = debug('bottender:session:write');
const debugAction = debug('bottender:action');

const MINUTES_IN_ONE_YEAR = 365 * 24 * 60;

function createMemorySessionStore(): SessionStore {
  const cache = new MemoryCacheStore(500);
  return new CacheBasedSessionStore(cache, MINUTES_IN_ONE_YEAR);
}

export function run<C extends Context>(action: Action<C>): Action<C> {
  return async function Run(
    context: C | C[],
    props: Props<C> = {}
  ): Promise<void> {
    let nextDialog: Action<C> | void = action;

    /* eslint-disable no-await-in-loop */
    invariant(
      typeof nextDialog === 'function',
      'Invalid entry action. You may have forgotten to export your entry action in your `index.js` or `src/index.js`.'
    );

    // TODO: refactor this with withProps or whatever
    debugAction(`Current Action: ${nextDialog.name || 'Anonymous'}`);
    nextDialog = await nextDialog(context, props);

    while (typeof nextDialog === 'function') {
      // TODO: improve this debug helper
      debugAction(`Current Action: ${nextDialog.name || 'Anonymous'}`);
      nextDialog = await nextDialog(context, {});
    }
    /* eslint-enable no-await-in-loop */

    return nextDialog;
  };
}

export type OnRequest = (
  body: JsonObject,
  requestContext?: RequestContext
) => void;

interface SessionHandlingState<Ctx> {
  timer?: ReturnType<typeof setTimeout>;
  seenTimer?: ReturnType<typeof setTimeout>;
  markedSeen?: boolean;
  typingTimer?: ReturnType<typeof setTimeout>;
  typingOn?: boolean;
  startTimestamp?: number;
  lastDuration: number;
  mainPromise?: Promise<void>;
  promiseResolver?: (value: void | PromiseLike<void>) => void;
  lastSession: Session;
  // events: Event[];
  contexts: Ctx[];
  requestContexts: RequestContext[];
}

// type handleContextsArgs<Ctx> = { context: Ctx; runHandler?: boolean };

export default class Bot<
  B extends Record<string, JsonValue> | PlainObject,
  C extends Client,
  E extends Event,
  Ctx extends Context<C, E>,
> implements IBot<B, C, E, Ctx>
{
  _sessions: SessionStore;

  _initialized: boolean;

  _connector: Connector<B, C>;

  _handler: Action<Ctx> | null;

  _errorHandler: Action<Ctx> | null;

  _initialState: JsonObject = {};

  _plugins: Function[] = [];

  _sync: boolean;

  _emitter: EventEmitter;

  _onRequest: OnRequest | undefined;

  _timerConfig: TimerOptions = {
    enabled: false,
    initialDuration: 15000,
    extendDuration: 5000,
    showSeenBeforeEndMs: 7000,
    showTypingBeforeEndMs: 3500,
    mode: TimerMode.Extend,
  };

  private _handlingStates: Map<string, SessionHandlingState<Ctx>> = new Map();

  constructor({
    connector,
    sessionStore = createMemorySessionStore(),
    sync = false,
    onRequest,
    timerConfig,
  }: {
    connector: Connector<B, C>;
    sessionStore?: SessionStore;
    sync?: boolean;
    onRequest?: OnRequest;
    timerConfig?: TimerOptions;
  }) {
    this._sessions = sessionStore;
    this._initialized = false;
    this._connector = connector;
    this._handler = null;
    this._errorHandler = null;
    this._sync = sync;
    this._emitter = new EventEmitter();
    this._onRequest = onRequest;
    if (timerConfig) this._timerConfig = timerConfig;
  }

  get connector(): Connector<B, C> {
    return this._connector;
  }

  get sessions(): SessionStore {
    return this._sessions;
  }

  get handler(): Action<Ctx> | null {
    return this._handler;
  }

  get emitter(): EventEmitter {
    return this._emitter;
  }

  onEvent(handler: Action<Ctx> | Builder<Ctx>): Bot<B, C, E, Ctx> {
    invariant(
      handler,
      'onEvent: Can not pass `undefined`, `null` or any falsy value as handler'
    );
    this._handler = 'build' in handler ? handler.build() : handler;
    return this;
  }

  onError(handler: Action<Ctx> | Builder<Ctx>): Bot<B, C, E, Ctx> {
    invariant(
      handler,
      'onError: Can not pass `undefined`, `null` or any falsy value as error handler'
    );
    this._errorHandler = 'build' in handler ? handler.build() : handler;
    return this;
  }

  setInitialState(initialState: JsonObject): Bot<B, C, E, Ctx> {
    this._initialState = initialState;
    return this;
  }

  use(plugin: Plugin<Ctx>): Bot<B, C, E, Ctx> {
    this._plugins.push(plugin);
    return this;
  }

  async initSessionStore(): Promise<void> {
    if (!this._initialized) {
      await this._sessions.init();
      this._initialized = true;
    }
  }

  createRequestHandler(): RequestHandler<B> {
    if (this._handler == null) {
      throw new Error(
        'Bot: Missing event handler function. You should assign it using onEvent(...)'
      );
    }

    if (!this._emitter.listenerCount('error')) {
      this._emitter.on('error', console.error);
    }

    return async (
      inputBody: B,
      requestContext?: RequestContext
    ): Promise<Response | void> => {
      if (!inputBody) {
        throw new Error('Bot.createRequestHandler: Missing argument.');
      }

      debugRequest('Incoming request body:');
      debugRequest(JSON.stringify(inputBody, null, 2));

      await this.initSessionStore();

      const body = camelcaseKeysDeep(inputBody) as B;

      if (this._onRequest) {
        this._onRequest(body as JsonObject, requestContext);
      }

      const events = this._connector.mapRequestToEvents(body);

      const contexts: Ctx[] = await pMap(
        events,
        async (event) => {
          const { platform } = this._connector;
          const sessionKey = await this._connector.getUniqueSessionKey(
            // TODO: deprecating passing request body in those connectors
            ['telegram', 'slack', 'viber', 'whatsapp'].includes(
              this._connector.platform
            )
              ? body
              : event,
            requestContext
          );

          // Create or retrieve session if possible
          let sessionId: string | undefined;
          let session: Session | undefined;
          if (sessionKey) {
            sessionId = `${platform}:${sessionKey}`;

            session =
              (await this._sessions.read(sessionId)) ||
              (Object.create(null) as Session);

            debugSessionRead(`Read session: ${sessionId}`);
            debugSessionRead(JSON.stringify(session, null, 2));

            Object.defineProperty(session, 'id', {
              configurable: false,
              enumerable: true,
              writable: false,
              value: session.id || sessionId,
            });

            if (!session.platform) session.platform = platform;

            Object.defineProperty(session, 'platform', {
              configurable: false,
              enumerable: true,
              writable: false,
              value: session.platform,
            });

            await this._connector.updateSession(
              session,
              // TODO: deprecating passing request body in those connectors
              ['telegram', 'slack', 'viber', 'whatsapp'].includes(
                this._connector.platform
              )
                ? body
                : event
            );
          }

          return this._connector.createContext({
            event,
            session,
            initialState: this._initialState,
            requestContext,
            emitter: this._emitter,
          });
        },
        {
          concurrency: 5,
        }
      );

      // Call all of extension functions before passing to handler.
      await Promise.all(
        contexts.map(async (context) =>
          Promise.all(this._plugins.map((ext) => ext(context)))
        )
      );

      if (this._handler == null) {
        throw new Error(
          'Bot: Missing event handler function. You should assign it using onEvent(...)'
        );
      }
      const handler: Action<Ctx> = this._handler;
      const errorHandler: Action<Ctx> | null = this._errorHandler;

      // ? TODO (DONE): only run concurrently for different session id
      // Group contexts by session ID and whether they are in waiting state
      const groupedContexts: {
        runHandlerNow: { [sessionId: string]: Ctx[] };
        inWaitingState: { [sessionId: string]: Ctx[] };
      } = contexts.reduce<{
        runHandlerNow: { [sessionId: string]: Ctx[] };
        inWaitingState: { [sessionId: string]: Ctx[] };
      }>(
        (acc, context) => {
          const sessionId = context.session?.id;

          if (sessionId) {
            const group =
              this._timerConfig.enabled && context.event.isText
                ? 'inWaitingState'
                : 'runHandlerNow';
            if (!acc[group][sessionId]) {
              acc[group][sessionId] = [];
            }
            acc[group][sessionId].push(context);
          }
          return acc;
        },
        { runHandlerNow: {}, inWaitingState: {} }
      );

      // Process contexts that are not in waiting state
      const immidiatePromises = Promise.all(
        Object.values(groupedContexts.runHandlerNow).map((contextGroup) =>
          contextGroup.reduce<Promise<void | Action<Ctx, object>>>(
            (promiseChain, context) => {
              return promiseChain.then(() =>
                Promise.resolve()
                  .then(() => run(handler)(context, {}))
                  .then(() => {
                    if (context.handlerDidEnd) {
                      return context.handlerDidEnd();
                    }
                  })
                  .catch((err) => {
                    if (errorHandler) {
                      return run(errorHandler)(context, {
                        error: err,
                      });
                    }
                    throw err;
                  })
                  .catch((err) => {
                    context.emitError(err);
                    throw err;
                  })
              );
            },
            Promise.resolve()
          )
        )
      );

      // Process contexts that are not in waiting state

      const waitingStatePromises = Promise.all(
        Object.entries(groupedContexts.inWaitingState).map(
          ([sessionId, contextGroup]) => {
            let currentHandlingState = this._handlingStates.get(sessionId);
            const latestContext = contextGroup.at(-1) as Ctx;
            if (currentHandlingState !== undefined) {
              if (this._timerConfig.mode === TimerMode.Extend) {
                clearTimeout(currentHandlingState?.timer);
              }
              if (latestContext.session !== undefined)
                currentHandlingState.lastSession =
                  latestContext.session as Session;
            } else {
              let promiseResolver: (
                value: void | PromiseLike<void>
              ) => void = () => {};
              const mainPromise = new Promise<void>((resolve, _) => {
                promiseResolver = resolve;
              });

              currentHandlingState = {
                lastSession: contextGroup.at(-1) || {},
                contexts: [],
                requestContexts: [requestContext || ({} as RequestContext)],
                mainPromise,
                lastDuration: this._timerConfig.initialDuration,
                promiseResolver,
              };
            }

            currentHandlingState.contexts =
              currentHandlingState.contexts.concat(contextGroup);
            const timeNow = Date.now();

            // Extend logic calculation
            if (this._timerConfig.mode === TimerMode.Extend) {
              currentHandlingState.lastDuration =
                currentHandlingState.startTimestamp
                  ? currentHandlingState.lastDuration -
                    (timeNow - currentHandlingState.startTimestamp) +
                    this._timerConfig.extendDuration
                  : currentHandlingState.lastDuration;
              currentHandlingState.startTimestamp = timeNow;
            }

            // Seen mechanism
            if (
              this._timerConfig.showSeenBeforeEndMs &&
              'markSeen' in latestContext &&
              typeof latestContext.markSeen === 'function'
            ) {
              if (
                this._timerConfig.seenAlwaysAfterFirst &&
                currentHandlingState.markedSeen
              ) {
                latestContext.markSeen();
              } else {
                clearTimeout(currentHandlingState.seenTimer);
                currentHandlingState.seenTimer = setTimeout(
                  (ctxInTimeout) => {
                    if (currentHandlingState) {
                      currentHandlingState.markedSeen = true;
                    }
                    if (typeof ctxInTimeout.markSeen === 'function')
                      ctxInTimeout.markSeen();
                  },
                  currentHandlingState.lastDuration -
                    this._timerConfig.showSeenBeforeEndMs,
                  latestContext
                );
              }
            }

            // Typing mechanism
            if (
              this._timerConfig.showTypingBeforeEndMs &&
              'typingOn' in latestContext &&
              'typingOff' in latestContext &&
              typeof latestContext.typingOff === 'function'
            ) {
              clearTimeout(currentHandlingState.typingTimer);
              if (currentHandlingState.typingOn) {
                currentHandlingState.typingOn = false;
                latestContext.typingOff();
              }
              currentHandlingState.typingTimer = setTimeout(
                (ctxInTimeout) => {
                  if (typeof ctxInTimeout.typingOn === 'function')
                    ctxInTimeout.typingOn();
                  if (currentHandlingState)
                    currentHandlingState.typingOn = true;
                },
                currentHandlingState.lastDuration -
                  this._timerConfig.showTypingBeforeEndMs,
                latestContext
              );
            }

            // eslint-disable-next-line no-fallthrough
            if (
              currentHandlingState.timer === undefined ||
              this._timerConfig.mode === TimerMode.Extend
            ) {
              currentHandlingState.timer = setTimeout(async () => {
                const currentHandlingStateTimeout =
                  this._handlingStates.get(sessionId);
                this._handlingStates.delete(sessionId);
                if (!currentHandlingStateTimeout) {
                  return Promise.resolve();
                }

                await Promise.resolve()
                  .then(() =>
                    run(handler)(currentHandlingStateTimeout.contexts, {})
                  )
                  .then(() => {
                    return currentHandlingStateTimeout.contexts.map(
                      (context) => {
                        if (context.handlerDidEnd) {
                          return context.handlerDidEnd();
                        }
                        return Promise.resolve();
                      }
                    );
                  })
                  .catch((err) => {
                    if (errorHandler) {
                      return run(errorHandler)(contexts, {
                        error: err,
                      });
                    }
                    throw err;
                  })
                  .catch((err) => {
                    currentHandlingStateTimeout.contexts.forEach((context) => {
                      context.emitError(err);
                    });
                    throw err;
                  });
                if (
                  this._timerConfig.showTypingBeforeEndMs &&
                  'typingOff' in latestContext &&
                  typeof latestContext.typingOff === 'function'
                )
                  latestContext.typingOff();
                const contextWriteSess =
                  currentHandlingStateTimeout.contexts.at(-1);
                if (contextWriteSess) {
                  contextWriteSess.isSessionWritten = true;

                  const { session } = contextWriteSess;

                  if (session) {
                    session.lastActivity = Date.now();

                    debugSessionWrite(`Write session: ${session.id}`);
                    debugSessionWrite(JSON.stringify(session, null, 2));

                    await this._sessions.write(session.id, session);
                  }
                }

                if (currentHandlingStateTimeout.promiseResolver)
                  currentHandlingStateTimeout.promiseResolver();
              }, currentHandlingState.lastDuration);
            } else if (this._timerConfig.mode === TimerMode.Refresh) {
              currentHandlingState.timer.refresh();
            }

            this._handlingStates.set(sessionId, currentHandlingState);
            return currentHandlingState.mainPromise;
          }
        )
      );

      Object.values(groupedContexts.inWaitingState).forEach(
        async (contextArray) => {
          const context = contextArray.at(-1) as Ctx;

          const { session } = context;

          if (session) {
            session.lastActivity = Date.now();

            debugSessionWrite(
              `Write session (updating time for waiting state): ${session.id}`
            );
            debugSessionWrite(JSON.stringify(session, null, 2));

            await this._sessions.write(session.id, session);
          }
        }
      );

      // Here we ignore contexts in the 'inWaitingState' group as per the requirement
      // You can handle these contexts separately if needed

      if (this._sync) {
        try {
          await immidiatePromises;
          await Promise.all(
            Object.values(groupedContexts.runHandlerNow).map(
              async (contextArray) => {
                await Promise.all(
                  contextArray.map(async (context) => {
                    context.isSessionWritten = true;

                    const { session } = context;

                    if (session) {
                      session.lastActivity = Date.now();

                      debugSessionWrite(`Write session: ${session.id}`);
                      debugSessionWrite(JSON.stringify(session, null, 2));

                      await this._sessions.write(session.id, session);
                    }
                  })
                );
                const sessionAfter = contextArray.at(-1)?.session;
                const waitingState = this._handlingStates.get(
                  contextArray.at(-1)?.session?.id
                );
                if (waitingState && sessionAfter)
                  waitingState.lastSession = sessionAfter;
              }
            )
          );

          await waitingStatePromises;
        } catch (err) {
          console.error(err);
        }

        // TODO: Any chances to merge multiple responses from context?
        const response = contexts[0].response;
        if (response && typeof response === 'object') {
          debugResponse('Outgoing response:');
          debugResponse(JSON.stringify(response, null, 2));
        }
        return response;
      }
      immidiatePromises
        .then(async (): Promise<void> => {
          await Promise.all(
            Object.values(groupedContexts.runHandlerNow).map(
              async (contextArray) => {
                await Promise.all(
                  contextArray.map(async (context) => {
                    context.isSessionWritten = true;
                    const { session } = context;

                    if (session) {
                      session.lastActivity = Date.now();

                      debugSessionWrite(`Write session: ${session.id}`);
                      debugSessionWrite(JSON.stringify(session, null, 2));

                      await this._sessions.write(session.id, session);
                    }
                  })
                );

                const sessionAfter = contextArray.at(-1)?.session;
                const waitingState = this._handlingStates.get(
                  contextArray.at(-1)?.session?.id
                );
                if (waitingState && sessionAfter)
                  waitingState.lastSession = sessionAfter;
              }
            )
          );
        })
        .catch(console.error);
    };
  }
}
