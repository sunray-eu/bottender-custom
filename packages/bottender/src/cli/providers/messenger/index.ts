import help from './help';
import persona from './persona';
import profile from './profile';
import webhook from './webhook';

export default {
  title: 'Bottender',
  subcommands: new Set(['help', 'persona', 'profile', 'webhook']),
  get persona() {
    return persona;
  },
  get profile() {
    return profile;
  },
  get webhook() {
    return webhook;
  },
  get help() {
    return help;
  },
};
