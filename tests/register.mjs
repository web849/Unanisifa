import { register } from "node:module";

// Node-এর টেস্ট রানার যেন extensionless রিলেটিভ ইমপোর্ট ('./lib/x')
// TypeScript ফাইলে (.ts) রিজলভ করতে পারে।
register("./resolver-hooks.mjs", import.meta.url);
