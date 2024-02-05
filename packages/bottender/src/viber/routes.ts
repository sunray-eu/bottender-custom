import { Action } from '../types';
import { RoutePredicate, route } from '../router';

import ViberContext from './ViberContext';

type Route = <C extends ViberContext>(
  action: Action<C>
) => {
  predicate: RoutePredicate<C>;
  action: Action<C>;
};

type Viber = Route & {
  any: Route;
  message: Route;
  subscribed: Route;
  unsubscribed: Route;
  conversationStarted: Route;
  delivered: Route;
  seen: Route;
  failed: Route;
};

const viber: Viber = <C extends ViberContext>(action: Action<C>) => {
  return route((context: C) => context.platform === 'viber', action);
};

viber.any = viber;

function message<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'viber' && context.event.isMessage,
    action
  );
}

viber.message = message;

function subscribed<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'viber' && context.event.isSubscribed,
    action
  );
}

viber.subscribed = subscribed;

function unsubscribed<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'viber' && context.event.isUnsubscribed,
    action
  );
}

viber.unsubscribed = unsubscribed;

function conversationStarted<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'viber' && context.event.isConversationStarted,
    action
  );
}

viber.conversationStarted = conversationStarted;

function delivered<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) =>
      (context.platform === 'viber' && context.event.delivered) || false,
    action
  );
}

viber.delivered = delivered;

function seen<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) =>
      (context.platform === 'viber' && context.event.seen) || false,
    action
  );
}

viber.seen = seen;

function failed<C extends ViberContext>(action: Action<C>) {
  return route(
    (context: C) =>
      (context.platform === 'viber' && context.event.failed) || false,
    action
  );
}

viber.failed = failed;

export default viber;
