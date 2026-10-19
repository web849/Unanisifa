import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

/**
 * Node-এর ডিফল্ট ESM রিজলভার রিলেটিভ ইমপোর্টে এক্সটেনশন বাধ্যতামূলক করে।
 * আমাদের সোর্স কোড (Next.js bundler রেজোলিউশন) এক্সটেনশন ছাড়াই ইমপোর্ট করে,
 * তাই টেস্ট চলাকালীন এই হুক এক্সটেনশন যুক্ত করে দেয়।
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    !path.extname(specifier)
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const base = path.resolve(path.dirname(parentPath), specifier);
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
  }
  return nextResolve(specifier, context);
}
