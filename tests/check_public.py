"""Verify publishable content, corpus integrity, and version consistency."""
from pathlib import Path
import hashlib
import json
import re
from collections import Counter

ROOT = Path(__file__).absolute().parents[1]
raw = (ROOT / 'app/src/main/assets/book.js').read_text(encoding='utf-8')
book = json.loads(raw[len('window.BOOK = '):].strip().rstrip(';'))
poems = book['poems']
assert len(poems) == 305 and len({p['id'] for p in poems}) == 305
assert dict(Counter(p['section'] for p in poems)) == {'国风':160, '小雅':74, '大雅':31, '颂':40}
assert book['meta']['hasSourcePDF'] and book['meta']['sourcePageCount'] == 820
pdf_info=json.loads((ROOT/'data/pdf-pages.json').read_text(encoding='utf-8'))
assert hashlib.sha256((ROOT/'app/src/main/assets/source-book.pdf').read_bytes()).hexdigest()==pdf_info['sha256']
corpus = json.loads((ROOT / 'data/shijing.json').read_text(encoding='utf-8'))
for p, original in zip(poems, corpus):
    assert p['title'] == original['title']
    assert [s['text'] for s in p['stanzas']] == original['content']
    assert all(''.join(s['sentences']) == s['text'] for s in p['stanzas'])
    assert 1<=p['page']<=820 and all(1<=s['page']<=820 for s in p['stanzas'])
assert '本项目编写' in poems[0]['stanzas'][0]['notes']
version = re.search(r'android:versionName="([^"]+)"', (ROOT/'app/src/main/AndroidManifest.xml').read_text(encoding='utf-8')).group(1)
app = (ROOT/'app/src/main/assets/app.js').read_text(encoding='utf-8')
assert "APP_VERSION='" + version + "'" in app
assert json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'] == version
for relative in ['LICENSE', 'LICENSES/chinese-poetry-MIT.txt', 'THIRD_PARTY_NOTICES.md']:
    assert (ROOT / relative).is_file()
checksum = ROOT / 'gradle/wrapper/checksums.json'
if checksum.exists():
    for name, entry in json.loads(checksum.read_text()).items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest() == entry['sha256']
# Check tracked/publishable source, while allowing ignored local build artifacts.
ignored = {'.git', '.gradle', '.gradle-home', '.local', '.tools', 'node_modules', 'build', 'dist', 'tmp', '__pycache__'}
for file in ROOT.rglob('*'):
    if not file.is_file(): continue
    relative = file.relative_to(ROOT)
    if any(part in ignored for part in relative.parts) or relative.as_posix().startswith('tests/artifacts/'): continue
    if relative.as_posix()=='app/src/main/assets/source-book.pdf':continue
    assert file.suffix.lower() not in {'.pdf','.jsonl','.jks','.keystore','.p12','.pem','.apk'}, str(relative)
    assert 'backups' not in relative.parts and 'proofreading' not in relative.parts, str(relative)
    assert file.name not in {'source-pages.json','annotations.local.json','local-config.json','local.properties'}, str(relative)
print('PASS: corpus, original PDF checksum and page mappings, versions, licenses, no keys or private records.')
