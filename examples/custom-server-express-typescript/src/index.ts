import {
  LineContext,
  MessengerContext,
  SlackContext,
  TelegramContext,
  ViberContext,
} from '@sunray-eu/bottender';

export default async function App(
  context:
    | MessengerContext
    | LineContext
    | SlackContext
    | TelegramContext
    | ViberContext
): Promise<void> {
  await context.sendText('Hello World');
}
