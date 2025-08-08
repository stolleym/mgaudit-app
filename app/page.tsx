[23:49:19.282] Running build in Washington, D.C., USA (East) – iad1
[23:49:19.283] Build machine configuration: 2 cores, 8 GB
[23:49:19.312] Cloning github.com/stolleym/mgaudit-app (Branch: main, Commit: e3771c2)
[23:49:19.584] Cloning completed: 271.000ms
[23:49:20.700] Restored build cache from previous deployment (7skWtBEbajeSUt8yyMd3KCD3Z2LN)
[23:49:25.363] Running "vercel build"
[23:49:25.852] Vercel CLI 44.7.3
[23:49:26.172] Your application is being built using `next build`. If you need to define a different build step, please create a `vercel-build` script in your `package.json` (e.g. `{ "scripts": { "vercel-build": "npm run prepare && next build" } }`).
[23:49:26.175] Installing dependencies...
[23:49:27.643] 
[23:49:27.643] up to date in 1s
[23:49:27.674] Detected Next.js version: 14.2.4
[23:49:27.680] Running "npm run vercel-build"
[23:49:27.793] 
[23:49:27.794] > vercel-build
[23:49:27.794] > next build
[23:49:27.794] 
[23:49:28.538]   ▲ Next.js 14.2.4
[23:49:28.538] 
[23:49:28.608]    Creating an optimized production build ...
[23:49:29.216]  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
[23:49:34.797]  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
[23:49:35.756]  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
[23:49:39.974]  ✓ Compiled successfully
[23:49:39.975]    Linting and checking validity of types ...
[23:49:40.322] 
[23:49:40.324]    We detected TypeScript in your project and reconfigured your tsconfig.json file for you. Strict-mode is set to false by default.
[23:49:40.325]    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
[23:49:40.325] 
[23:49:40.325]    	- include was updated to add '.next/types/**/*.ts'
[23:49:40.325] 
[23:49:44.315] Failed to compile.
[23:49:44.316] 
[23:49:44.316] ./app/page.tsx:31:6
[23:49:44.316] Type error: Duplicate identifier 'ActionItem'.
[23:49:44.316] 
[23:49:44.316] [0m [90m 29 |[39m }[33m;[39m[0m
[23:49:44.316] [0m [90m 30 |[39m[0m
[23:49:44.316] [0m[31m[1m>[22m[39m[90m 31 |[39m type [33mActionItem[39m [33m=[39m {[0m
[23:49:44.316] [0m [90m    |[39m      [31m[1m^[22m[39m[0m
[23:49:44.316] [0m [90m 32 |[39m   id[33m:[39m string[33m;[39m[0m
[23:49:44.316] [0m [90m 33 |[39m   venue[33m:[39m [33mVenue[39m[33m;[39m[0m
[23:49:44.317] [0m [90m 34 |[39m   month[33m:[39m string[33m;[39m[0m
[23:49:44.359] Error: Command "npm run vercel-build" exited with 1
