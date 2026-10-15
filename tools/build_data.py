"""Compile the openly licensed Shijing corpus; local annotations stay untracked."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).absolute().parents[1]
ASSETS = ROOT / 'app/src/main/assets'
source = ROOT / 'data/shijing.json'
corpus = json.loads(source.read_text(encoding='utf-8'))
annotations = json.loads((ROOT / 'data/annotations.json').read_text(encoding='utf-8'))
private_annotations = ROOT / 'data/annotations.local.json'
if private_annotations.exists():
    for poem_id, changes in json.loads(private_annotations.read_text(encoding='utf-8')).items():
        annotations.setdefault(poem_id, {}).update(changes)
config_file = ROOT / 'data/local-config.json'
config = json.loads(config_file.read_text(encoding='utf-8')) if config_file.exists() else {}
poems = []
for index, original in enumerate(corpus, 1):
    poem_id = 'p' + str(index).zfill(3)
    extra = annotations.get(poem_id, {})
    notes = extra.get('stanzas', {})
    chapter = original['chapter']
    section = '颂' if chapter.endswith('颂') else chapter
    group = chapter + ' · ' + original['section'] if section == '颂' else original['section']
    stanzas = []
    for stanza_index, text in enumerate(original['content']):
        entry = notes.get(str(stanza_index), {})
        stanzas.append({
            'text': text,
            'sentences': re.findall(r'[^。！？!?]+[。！？!?]?', text) or [text],
            'notes': entry.get('notes', ''),
            'page': entry.get('page'),
        })
    poems.append({
        'id': poem_id, 'title': original['title'], 'section': section, 'group': group,
        'intro': extra.get('intro', '《' + original['title'] + '》收于《诗经·' + chapter + '·' + original['section'] + '》。公开版未收录现代题解。'),
        'page': extra.get('page'), 'stanzas': stanzas,
    })
has_pdf = (ASSETS / 'source-book.pdf').exists() and int(config.get('sourcePageCount', 0)) > 0
book = {
    'meta': {
        'edition': 'open-source', 'dataSource': 'chinese-poetry/chinese-poetry',
        'sourceUrl': 'https://github.com/chinese-poetry/chinese-poetry/blob/master/诗经/shijing.json',
        'sourceSha256': hashlib.sha256(source.read_text(encoding='utf-8').encode('utf-8')).hexdigest(), 'dataLicense': 'MIT',
        'hasSourcePDF': has_pdf, 'sourcePageCount': config.get('sourcePageCount', 0) if has_pdf else 0,
        'hasSourceOCR': has_pdf and (ASSETS / 'source-pages.json').exists(),
        'notice': '公开版收录 305 篇古典诗文及少量自行编写的示例注释，未附商业书籍扫描、现代题解及注析全文。',
    },
    'poems': poems,
}
ASSETS.mkdir(parents=True, exist_ok=True)
(ASSETS / 'book.js').write_text('window.BOOK = ' + json.dumps(book, ensure_ascii=False) + ';\n', encoding='utf-8')
print('Compiled', len(poems), 'poems. Bundled PDF:', has_pdf)
