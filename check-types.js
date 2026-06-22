const fs = require('fs');
const f = 'apps/web/node_modules/@supabase/supabase-js/dist/module/lib/types.d.ts';
if (fs.existsSync(f)) {
  console.log(fs.readFileSync(f, 'utf8').slice(0, 3000));
} else {
  console.log('not found at', f);
  // try other paths
  const alt = 'node_modules/@supabase/supabase-js/dist/module/lib/types.d.ts';
  if (fs.existsSync(alt)) {
    console.log('found at', alt);
    console.log(fs.readFileSync(alt, 'utf8').slice(0, 3000));
  }
}
