from pathlib import Path
import zipfile,shutil,sys
root=Path(__file__).resolve().parents[1];sub=root/'public/submission';out=Path('/workspace/scratch/25df116fdb2c/deliverables')
# Only explicit source trees; never credentials, databases, node_modules or git history.
roots=['app','build','components','db','drizzle','hooks','lib','public','scripts','tests','vendor']
files=['README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','next-env.d.ts','cloudflare-env.d.ts','components.json','drizzle.config.ts','next.config.ts','postcss.config.mjs','vite.config.ts','eslint.config.mjs','.gitignore','.openai/hosting.json']
archive=sub/'tuitionguard-source.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for path in files:
  p=root/path
  if p.is_file():z.write(p,'tuitionguard/'+path)
 for dirname in roots:
  for p in (root/dirname).rglob('*'):
   if p.is_file() and p!=archive and p.suffix!='.zip' and '__pycache__' not in p.parts and p.suffix!='.pyc':z.write(p,'tuitionguard/'+str(p.relative_to(root)))
# User-facing documentation bundle contains no git repository or application source.
if out.exists() and '--source-only' not in sys.argv:
 with zipfile.ZipFile(out/'TuitionGuard_Competition_Materials.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in sub.iterdir():
   if p.is_file() and p.suffix in ['.md','.json','.pptx','.pdf']:z.write(p,p.name)
  for p in (root/'public').glob('*report.json'):z.write(p,'measured-reports/'+p.name)
  z.write(root/'tests/benchmark-cases.json','dataset/benchmark-cases.json')
  z.write(root/'tests/live-layout-cases.json','dataset/live-layout-cases.json')
print('Source and submission packages refreshed.')
