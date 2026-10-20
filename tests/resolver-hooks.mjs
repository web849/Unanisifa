import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];
const ROOT = path.resolve(import.meta.dirname, "..");

function tryResolveFile(base) {
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = path.join(base, `index${ext}`);
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return null;
}

/**
 * Node-এর ডিফল্ট ESM রিজলভার রিলেটিভ ইমপোর্টে এক্সটেনশন বাধ্যতামূলক করে।
 * আমাদের সোর্স কোড (Next.js bundler রেজোলিউশন) এক্সটেনশন ছাড়াই ইমপোর্ট করে,
 * তাই টেস্ট চলাকালীন এই হুক এক্সটেনশন ও `@/` অ্যালিয়াস যুক্ত করে দেয়।
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = tryResolveFile(path.resolve(ROOT, specifier.slice(2)));
    if (hit) return hit;
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    !path.extname(specifier)
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const hit = tryResolveFile(path.resolve(path.dirname(parentPath), specifier));
    if (hit) return hit;
  }
  return resolveBare(specifier, context, nextResolve);
}

/** `.tsx` কম্পোনেন্ট টেস্টে সরাসরি ইমপোর্ট করার জন্য হালকা JSX ট্রান্সপাইল হুক */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, "utf8");
    const output = ts.transpileModule(source, {
      fileName: filePath,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return {
      format: "module",
      source: output.outputText,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}

/**
 * প্যাকেজ স্পেসিফায়ার (যেমন 'next/server') — Node নিজেই এক্সপোর্ট ম্যাপ
 * দিয়ে রিজলভ করুক। কোনো প্যাকেজে ".js" এক্সটেনশন ছাড়া এন্ট্রি না থাকলে
 * (ERR_MODULE_NOT_FOUND) ".js" যোগ করে আবার চেষ্টা করা হয়।
 */
async function resolveBare(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    if (specifier.endsWith(".js")) throw error;
    return nextResolve(`${specifier}.js`, context);
  }
}
