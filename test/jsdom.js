import { JSDOM, VirtualConsole, ResourceLoader } from 'jsdom';
import { SourceTextModule } from 'node:vm';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);

const resources = new ResourceLoader({
  strictSSL: false,
});

// NOTE: type="module" on script tag not natively supported
// @see https://github.com/jsdom/jsdom/issues/2475
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dom = await JSDOM.fromFile(path.join(__dirname, 'index.html'), { virtualConsole, runScripts: 'dangerously', resources });
const context = dom.getInternalVMContext();
const modules = {};

for await (let script of Array.from(dom.window.document.querySelectorAll('script[type="module"]'))) {
  const scriptsrc = script.src.startsWith('file://') ? script.src.replace('file://', '') : '';
  let basepath;
  let code = '';

  if (scriptsrc !== '') {
    basepath = path.dirname(scriptsrc);
    code = await readFile(scriptsrc, { encoding: 'utf8' });
  } else {
    basepath = __dirname;
    code = script.textContent;
  }

  const source = new SourceTextModule(code, { context });

  await source.link(async (specifier) => {
    if (!modules[specifier]) {
      modules[specifier] = new SourceTextModule(
        await readFile(path.join(basepath, specifier), { encoding: 'utf8' }),
        { context },
      );
    }

    return modules[specifier];
  });

  await source.evaluate();
}
