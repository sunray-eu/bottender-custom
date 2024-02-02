import help from './help';

export default {
  title: 'LINE',
  subcommands: new Set([]),
  get help() {
    return help;
  },
};
