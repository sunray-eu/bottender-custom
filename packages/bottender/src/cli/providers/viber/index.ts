import help from './help';
import webhook from './webhook';

export default {
  title: 'Viber',
  subcommands: new Set(['help', 'webhook']),
  get webhook() {
    return webhook;
  },
  get help() {
    return help;
  },
};
