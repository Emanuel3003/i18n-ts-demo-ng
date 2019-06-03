import * as ts from 'typescript';

// TODO move to config
const RequireAlli18NKeys = false; // if true onda all 18n keys must be found othervse error is thrown;

// Read translations
import { Xliff, Node } from '@angular/compiler';
const fs = require('fs');
const path = require('path');

let localeId: string; // hr || en ...

let i18nLocale = 0; // 0 - parameter not found | 1 - parameter is fount so next is locale string (hr, ...)

// parse parameters
process.argv.forEach(pParam => {

  console.log('param:' + pParam);
  // get Locale is using: ng serve ...
  if (pParam.startsWith('--configuration=')) {
    localeId = pParam.replace('--configuration=', '');
    console.log('Locale:' + localeId);
  }

  // Has to be before code down
  if (i18nLocale === 1) {
    i18nLocale = 2;
    localeId = pParam;
    console.log('Locale:' + localeId);
  }

  // Get locale if using: ng build --prod --i18n-locale en ...
  if (pParam.startsWith('--i18n-locale')) {
    i18nLocale = 1;
    localeId = pParam.replace('--config--i18n-locale ', '')
  }
});

// Load translation
// tslint:disable-next-line:max-line-length
if (localeId === undefined) { throw new Error(`No language specified.\nUsage: ng serve --configuration=hr --aot --plugin ~dist/out-tsc/i18n-plugin.js`); }
const content = fs.readFileSync(`src/translate/messages.${localeId}.xlf`, 'utf8');
const xliff = new Xliff().load(content, '');

export const I18NTransformer = <T extends ts.Node>(context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    function visit(node: ts.Node): ts.Node {
      if (
        rootNode.fileName.includes('node_modules')
        || !rootNode.fileName.includes('.ts')
        // || ts.isToken(node)
      ) {
        return ts.visitEachChild(node, visit, context);
      }

      if (ts.isStringLiteral(node)) {
        // teplace @@ with translation
        if (node.text.includes('@@')) {
          // take key for translatioc
          const tSourceKey = node.text;
          const tI18NKey = node.text.replace('@@', '');
          // find key
          const tTranslation: any = xliff.i18nNodesByMsgId[tI18NKey];
          if (tTranslation) {
            // let t1 = tTranslation[0];

            // let tLocaleStr = t1.toString(); //tTranslation[0].value;
            const tLocaleStr = tTranslation[0].value;
            console.log(ConsoleColor.BgCyan, 'i18n key: ', ConsoleColor.Reset, tI18NKey + '=> translation   : ' + tLocaleStr);
            const tNew2 = node.text.replace(tSourceKey, tLocaleStr);
            return ts.createStringLiteral(tNew2);
          }
          const tMessage = 'ERROR! No translation for key: ' + tI18NKey + ', source:' + rootNode.fileName;
          console.log(ConsoleColor.BgRed, tMessage, ConsoleColor.Reset);
          if (RequireAlli18NKeys) {
            throw new Error(tMessage);
          }
        }
      }

      return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };
};

class ConsoleColor {
  static Reset = '\x1b[0m';
  static Bright = '\x1b[1m';
  static Dim = '\x1b[2m';
  static Underscore = '\x1b[4m';
  static Blink = '\x1b[5m';
  static Reverse = '\x1b[7m';
  static Hidden = '\x1b[8m';

  static FgBlack = '\x1b[30m';
  static FgRed = '\x1b[31m';
  static FgGreen = '\x1b[32m';
  static FgYellow = '\x1b[33m';
  static FgBlue = '\x1b[34m';
  static FgMagenta = '\x1b[35m';
  static FgCyan = '\x1b[36m';
  static FgWhite = '\x1b[37m';

  static BgBlack = '\x1b[40m';
  static BgRed = '\x1b[41m';
  static BgGreen = '\x1b[42m';
  static BgYellow = '\x1b[43m';
  static BgBlue = '\x1b[44m';
  static BgMagenta = '\x1b[45m';
  static BgCyan = '\x1b[46m';
  static BgWhite = '\x1b[47m';
}
