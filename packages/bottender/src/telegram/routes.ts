import { Action } from '../types';
import { RoutePredicate, route } from '../router';

import TelegramContext from './TelegramContext';

type Route = <C extends TelegramContext>(
  action: Action<C>
) => {
  predicate: RoutePredicate<C>;
  action: Action<C>;
};

type Telegram = Route & {
  any: Route;
  message: Route;
  editedMessage: Route;
  channelPost: Route;
  editedChannelPost: Route;
  inlineQuery: Route;
  chosenInlineResult: Route;
  callbackQuery: Route;
  shippingQuery: Route;
  preCheckoutQuery: Route;
  poll: Route;
  pollAnswer: Route;
};

const telegram: Telegram = <C extends TelegramContext>(action: Action<C>) => {
  return route((context: C) => context.platform === 'telegram', action);
};

telegram.any = telegram;

function message<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'telegram' && context.event.isMessage,
    action
  );
}

telegram.message = message;

function editedMessage<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isEditedMessage,
    action
  );
}

telegram.editedMessage = editedMessage;

function channelPost<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isChannelPost,
    action
  );
}

telegram.channelPost = channelPost;

function editedChannelPost<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isEditedChannelPost,
    action
  );
}

telegram.editedChannelPost = editedChannelPost;

function inlineQuery<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isInlineQuery,
    action
  );
}

telegram.inlineQuery = inlineQuery;

function chosenInlineResult<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isChosenInlineResult,
    action
  );
}

telegram.chosenInlineResult = chosenInlineResult;

function callbackQuery<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isCallbackQuery,
    action
  );
}

telegram.callbackQuery = callbackQuery;

function shippingQuery<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isShippingQuery,
    action
  );
}

telegram.shippingQuery = shippingQuery;

function preCheckoutQuery<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isPreCheckoutQuery,
    action
  );
}

telegram.preCheckoutQuery = preCheckoutQuery;

function poll<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'telegram' && context.event.isPoll,
    action
  );
}

telegram.poll = poll;

function pollAnswer<C extends TelegramContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'telegram' && context.event.isPollAnswer,
    action
  );
}

telegram.pollAnswer = pollAnswer;

export default telegram;
