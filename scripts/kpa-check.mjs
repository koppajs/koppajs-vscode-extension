import { runKpaCheck } from '@koppajs/koppajs-kpa-check';
import { toEnglishMessage } from '../src/language/englishMessages.cjs';

const argv = process.argv.slice(2);
const optionEnd = argv.indexOf('--');
const json = (optionEnd < 0 ? argv : argv.slice(0, optionEnd)).includes('--json');

process.exitCode = runKpaCheck(argv, {
  outputFormat: 'json',
  io: {
    error(message) {
      console.error(toEnglishMessage(message));
    },
    log(payload) {
      const report = JSON.parse(payload);
      if (report.message) {
        report.message = toEnglishMessage(report.message);
      }
      for (const diagnostic of report.diagnostics ?? []) {
        diagnostic.message = toEnglishMessage(diagnostic.message);
      }
      if (json) {
        console.log(JSON.stringify(report, null, 2));
      } else if (report.kind === 'version') {
        console.log(report.version);
      } else if (report.kind === 'help') {
        console.log(
          [
            report.packageName + ' ' + report.version,
            '',
            'Usage:',
            '  ' + report.usage,
            '',
            report.description,
            '',
            'Options:',
            ...report.options.map((option) => '  ' + option.flag.padEnd(10) + option.description),
            '',
            'Notes:',
            '  Targets may be files or directories.',
            '  With no targets, kpa-check checks the current working directory.',
          ].join('\n'),
        );
      } else {
        for (const diagnostic of report.diagnostics ?? []) {
          console.log(
            diagnostic.relativeFilePath +
              ':' +
              diagnostic.line +
              ':' +
              diagnostic.character +
              ' warning ' +
              diagnostic.message,
          );
        }
        (report.exitCode === 0 ? console.log : console.error)(report.message);
      }
    },
  },
});
