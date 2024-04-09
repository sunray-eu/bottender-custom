import { EventEmitter } from 'events';

import storage from 'node-persist';
import warning from 'warning';
import { BatchConfig } from '@sunray-eu/facebook-batch';
import {
  Connector,
  FacebookBaseConnector,
  MessengerConnector,
  MessengerContext,
  MessengerEvent,
  MessengerTypes,
  RequestContext,
} from 'bottender';
import { JsonObject } from 'type-fest';

import FacebookClient from './FacebookClient';
import FacebookContext from './FacebookContext';
import FacebookEvent from './FacebookEvent';
import { ChangesEntry, FacebookWebhookRequestBody } from './FacebookTypes';

// TODO: use exported type
type Session = Record<string, unknown>;

interface CommentLevelData {
  parentId?: string;
  level: number;
  sessionId?: string;
  fromId?: string;
}

export type FacebookConnectorOptions = {
  appId: string;
  appSecret: string;
  accessToken?: string;
  client?: FacebookClient;
  mapPageToAccessToken?: (pageId: string) => Promise<string>;
  verifyToken?: string;
  batchConfig?: BatchConfig;
  origin?: string;
  skipAppSecretProof?: boolean;
  skipProfile?: boolean;
};

export default class FacebookConnector
  extends FacebookBaseConnector<FacebookWebhookRequestBody, FacebookClient>
  implements Connector<FacebookWebhookRequestBody, FacebookClient>
{
  _mapPageToAccessToken: ((pageId: string) => Promise<string>) | null = null;

  _messengerConnector: MessengerConnector;

  // const CommentLevels = new Map<
  //   string,
  //   { parentId?: string; level: number; sessionId?: string }
  // >();

  _commentsLevelsStorage = storage.create({
    dir: '.fbcommentshierarchydata',
    stringify: JSON.stringify,
    parse: JSON.parse,
    encoding: 'utf8',
    logging: false, // can also be custom logging function
    ttl: 60 * 24 * 2 * 60 * 1000, // ttl in milliseconds
    expiredInterval: 2 * 60 * 1000, // every 2 minutes the process will clean-up the expired cache
    forgiveParseErrors: false,
  });

  public constructor(options: FacebookConnectorOptions) {
    super({
      ...options,
      ClientClass: FacebookClient,
    });

    const { mapPageToAccessToken } = options;

    this._mapPageToAccessToken = mapPageToAccessToken ?? null;
    this._messengerConnector = new MessengerConnector({
      ...options,
      ClientClass: FacebookClient,
      mapPageToAccessToken,
    });

    this._commentsLevelsStorage.init();
  }

  async getCommentLevelData(
    event: FacebookEvent
  ): Promise<CommentLevelData | undefined> {
    if (!event.isComment || !event.comment) {
      return undefined;
    }
    const comment = event.comment;
    const commentId = comment.commentId;
    const readData: CommentLevelData | null =
      await this._commentsLevelsStorage.get(commentId);

    if (readData) {
      return readData;
    }

    if (event.isFirstLayerComment) {
      const newCommentData: CommentLevelData = {
        level: 1,
        sessionId: comment.commentId,
        fromId: comment.from.id,
      };
      await this._commentsLevelsStorage.setItem(commentId, newCommentData);
      return newCommentData;
    }

    let currentCommentData: CommentLevelData = {
      level: 3,
      parentId: comment.parentId,
      fromId: comment.from.id,
    };

    const commentsPath: (CommentLevelData & { commentId: string })[] = [
      { ...currentCommentData, commentId: comment.commentId },
    ];

    while (true) {
      let parentComment: CommentLevelData | null =
        // eslint-disable-next-line no-await-in-loop
        await this._commentsLevelsStorage.get(
          currentCommentData.parentId as string
        );

      if (parentComment) {
        this.processParentComment(parentComment, commentsPath);
        return commentsPath[commentsPath.length - 1];
      }

      // eslint-disable-next-line no-await-in-loop
      const apiComment = await this.client.getComment(
        currentCommentData.parentId as string,
        { fields: ['parent'] }
      );

      const isRoot = apiComment.parent === undefined;

      if (isRoot) {
        parentComment = { level: 1 };
        this.processRootComment(
          parentComment,
          commentsPath,
          currentCommentData
        );
        return commentsPath[commentsPath.length - 1];
      }

      parentComment = { level: 3, parentId: apiComment.parent.id };
      commentsPath.push({
        ...parentComment,
        commentId: currentCommentData.parentId as string,
      });
      currentCommentData = parentComment;
    }
  }

  private async processParentComment(
    parentComment: CommentLevelData,
    commentsPath: (CommentLevelData & { commentId: string })[]
  ): Promise<void> {
    if (parentComment.level === 1) {
      commentsPath[commentsPath.length - 1].level = 2;
    }
    const newSessionId = parentComment.sessionId;
    commentsPath.forEach((val) => {
      val.sessionId = newSessionId;
    });

    await Promise.all(
      commentsPath.map(async (val) => {
        const { commentId, ...rest } = val;
        await this._commentsLevelsStorage.setItem(commentId, rest);
      })
    );
  }

  private async processRootComment(
    parentComment: CommentLevelData,
    commentsPath: (CommentLevelData & { commentId: string })[],
    currentCommentData: CommentLevelData
  ): Promise<void> {
    commentsPath[commentsPath.length - 1].level = 2;
    const newSessionId = `${currentCommentData.parentId}`;

    commentsPath.push({
      ...parentComment,
      // level: 2, // Assuming root comments are treated as level 2 for consistency with the previous logic
      sessionId: newSessionId,
      commentId: currentCommentData.parentId as string,
    });

    commentsPath.forEach((val) => {
      val.sessionId = newSessionId;
    });

    await Promise.all(
      commentsPath.map(async (val) => {
        await this._commentsLevelsStorage.setItem(val.commentId, val);
      })
    );
  }

  /**
   * The name of the platform.
   *
   */
  get platform(): 'facebook' {
    return 'facebook';
  }

  async getUniqueSessionKey(
    event: FacebookEvent | MessengerEvent
  ): Promise<string | null> {
    if (event instanceof MessengerEvent) {
      return this._messengerConnector.getUniqueSessionKey(event);
    }

    if (event.isCommentAdd) {
      const commentLevelData = await this.getCommentLevelData(event);
      if (commentLevelData && commentLevelData.level !== 3) {
        return commentLevelData.sessionId || null;
      }
    }

    // TODO: How to determine session key in facebook feed events
    return null;
  }

  public async updateSession(
    session: Session,
    event: FacebookEvent | MessengerEvent
  ): Promise<void> {
    if (event instanceof MessengerEvent) {
      this._messengerConnector.updateSession(session, event);
      return;
    }

    if (!session.user) {
      session.page = {
        id: event.pageId,
        _updatedAt: new Date().toISOString(),
      };

      session.user = {
        _updatedAt: new Date().toISOString(),
        id: await this.getUniqueSessionKey(event),
      };
    }

    Object.freeze(session.user);
    Object.defineProperty(session, 'user', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: session.user,
    });

    Object.freeze(session.page);
    Object.defineProperty(session, 'page', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: session.page,
    });
  }

  public mapRequestToEvents(
    body: FacebookWebhookRequestBody
  ): (FacebookEvent | MessengerEvent)[] {
    // TODO: returns InstagramEvent (object === 'instagram')
    if (body.object !== 'page') {
      return [];
    }

    const bodyEntry: (MessengerTypes.MessagingEntry | ChangesEntry)[] =
      body.entry;

    return bodyEntry
      .map<FacebookEvent | MessengerEvent | null>((entry) => {
        const pageId = entry.id;
        const timestamp = entry.time;
        if ('messaging' in entry) {
          return new MessengerEvent(entry.messaging[0], {
            pageId,
            isStandby: false,
          });
        }

        if ('standby' in entry) {
          return new MessengerEvent(entry.standby[0], {
            pageId,
            isStandby: true,
          });
        }

        if ('changes' in entry) {
          return new FacebookEvent(entry.changes[0], { pageId, timestamp });
        }

        return null;
      })
      .filter(
        (event): event is FacebookEvent | MessengerEvent => event !== null
      );
  }

  public async createContext(params: {
    event: FacebookEvent | MessengerEvent;
    session?: Session;
    initialState?: JsonObject;
    requestContext?: RequestContext;
    emitter?: EventEmitter;
  }): Promise<FacebookContext | MessengerContext> {
    let customAccessToken;

    if (this._mapPageToAccessToken) {
      const { pageId } = params.event;

      if (!pageId) {
        warning(false, 'Could not find pageId from request body.');
      } else {
        customAccessToken = await this._mapPageToAccessToken(pageId);
      }
    }

    let client;
    if (customAccessToken) {
      client = new FacebookClient({
        accessToken: customAccessToken,
        appSecret: this._appSecret,
        origin: this._origin,
        skipAppSecretProof: this._skipAppSecretProof,
      });
    } else {
      client = this._client;
    }

    if (params.event instanceof FacebookEvent) {
      return new FacebookContext({
        ...params,
        event: params.event,
        client,
        customAccessToken,
        batchQueue: this._batchQueue,
        appId: this._appId,
      });
    }
    return new MessengerContext({
      ...params,
      event: params.event,
      client,
      customAccessToken,
      batchQueue: this._batchQueue,
      appId: this._appId,
    });
  }
}
