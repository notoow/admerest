import {build} from 'esbuild';
import {copyFileSync} from 'node:fs';
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/vendor/supabase.js',legalComments:'eof'});
copyFileSync('node_modules/@supabase/supabase-js/LICENSE','dist/vendor/supabase-LICENSE.txt');
