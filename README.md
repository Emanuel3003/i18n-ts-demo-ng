
# Angular i18n translations in typescript
- Sample code for using translations in typescript
- minimal version of angular 7.2


## tutorials
### Angular i18n 
- https://medium.freecodecamp.org/how-to-implement-localization-in-angular-using-i18n-tools-a88898b1a0d0

### Typescript & precompiling
- https://stackoverflow.com/questions/52408590/angular-6-and-i18n-in-typescript/54684087#54684087
- https://jool.nl/techblog-custom-typescript-transformers-with-angular-cli/
- https://github.com/manfredsteyer/ngx-build-plus

## 1. Preparation
### 1.1 Create new angular project 
- ng new i18n-ts-demo-ng

### 1.2 Setup Angular i18n translations 
https://medium.freecodecamp.org/how-to-implement-localization-in-angular-using-i18n-tools-a88898b1a0d0

- app.component.html
```html
    <h1 i18n="@@my.test.header">Hello i18n!</h1>
    Test header from ts variable {{title2}}
```

- app.component.ts
```ts
    import { Component } from '@angular/core';

    @Component({
      selector: 'app-root',
      templateUrl: './app.component.html',
      styleUrls: ['./app.component.scss']
    })
    export class AppComponent {
      title = 'i18n-ts-demo-ng';
      title2 = '@@my.test.header';
    }
```    
- in terminal execute: `ng xi18n --i18n-locale hr --output-path translate`
- in src/translate copy messages.xlf to messages.hr.xlf
- edit messages.hr.xlf
```html
    <source>Hello i18n!</source>
    <target>Translated</target>
```

- Open the angular.json file and add the following configuration.
```json
"build": {
  ...
  "configurations": {
    ...
    "hr": {
      "aot": true,
      "i18nFile": "src/translate/messages.hr.xlf",
      "i18nFormat": "xlf",
      "i18nLocale": "hr",
      "i18nMissingTranslation": "error"
    }
  }
},
"serve": {
  ...
  "configurations": {
    ...
    "hr": {
      "browserTarget": "i18n-ts-demo-ng:build:hr"
    }
  }
}
```

- ng serve --configuration=hr

### 1.3 now setup for ts translations
- in treminal: `ng add ngx-build-plus`

```ts
//create file i18n-plugin.ts in root
import { I18NTransformer } from './i18n';
import { AngularCompilerPlugin } from '@ngtools/webpack';

function findAngularCompilerPlugin(webpackCfg): AngularCompilerPlugin | null {
  return webpackCfg.plugins.find(plugin =>  plugin instanceof AngularCompilerPlugin);
}

// The AngularCompilerPlugin has nog public API to add transformations, user private API _transformers instead.
function addTransformerToAngularCompilerPlugin(acp, transformer): void {
  acp._transformers = [transformer, ...acp._transformers];
}

export default {
  pre() {
    // This hook is not used in our example
  },

  // This hook is used to manipulate the webpack configuration
  config(cfg) {
    // Find the AngularCompilerPlugin in the webpack configuration
    const angularCompilerPlugin = findAngularCompilerPlugin(cfg);

    if (!angularCompilerPlugin) {
      console.error('Could not inject the typescript transformer: Webpack AngularCompilerPlugin not found');
      return;
    }

    addTransformerToAngularCompilerPlugin(angularCompilerPlugin, I18NTransformer);
    return cfg;
  },

  post() {
    // This hook is not used in our example
  }
};
```

```ts
//create file i18n.ts in root
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
```

- in terminal start: `tsc --skipLibCheck --module umd -w `

### 1.4 Serve
ng serve --configuration=hr --aot --plugin ~dist/out-tsc/i18n-plugin.js

### 1.5 Build
ng build --prod --i18n-locale hr --i18n-format xlf --i18n-file src/translate/messages.hr.xlf --output-path=dist/hr --baseHref /hr/ --plugin ~dist/out-tsc/i18n-plugin.js

# Create component for dummy i18n strings
in order to have .xlf for .ts files we need to create dummy placeholder for them so "ng xi18n --i18n-locale hr --output-path translate" can extract them
- ng g m model/test.i18n --flat
- ng g c model/test.i18n --flat
- now leave only html, component and module
- in html add keys for strings that has to be translated in .ts like: 
```html 
<h1 i18n="@@my.test.header">Hello i18n!</h1> 
```
- repeat steps [1.2 Setup Angular i18n translations](#1-2-setup-angular-i18n-translations)
