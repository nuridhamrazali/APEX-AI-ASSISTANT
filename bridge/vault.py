"""Obsidian-compatible full transcripts and bounded, keyword-based recall."""
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

class Vault:
    def __init__(self, root):
        self.root = Path(root).expanduser().resolve()
        self.folder = self.root / 'APEX' / 'Conversations'
        self.folder.mkdir(parents=True, exist_ok=True)
        if self.folder.resolve() != self.folder:
            raise ValueError('APEX conversation folder must not be a symlink')

    def start(self, prompt):
        now = datetime.now(timezone.utc)
        path = self.folder / (now.strftime('%Y-%m-%d_%H-%M-%S_') + str(uuid.uuid4()) + '.md')
        with path.open('x', encoding='utf-8') as f:
            f.write(f'---\ncreated: {now.isoformat()}\nsource: APEX\n---\n\n# Conversation\n\n## You\n\n{prompt}\n')
        return path

    def finish(self, path, text, failed=False):
        with path.open('a', encoding='utf-8') as f:
            f.write('\n## ' + ('System error' if failed else 'APEX') + '\n\n' + text + '\n')

    def search(self, query, limit=6, exclude=None):
        terms = set(re.findall(r'\w{3,}', query.casefold())) - {'the', 'and', 'what', 'that', 'with', 'apex', 'you', 'did'}
        found = []
        # Read the notes on every search, so edits/deletions in Obsidian are respected.
        for path in self.folder.glob('*.md'):
            if path == exclude or path.is_symlink():
                continue
            content = path.read_text(encoding='utf-8')
            low = content.casefold()
            score = sum(min(low.count(t), 4) for t in terms)
            found.append((score, path.name, content))
        found.sort(key=lambda x: (x[0], x[1]), reverse=True)
        results = []
        for score, name, content in found[:max(1, min(int(limit), 10))]:
            positions = [content.casefold().find(t) for t in terms if t in content.casefold()]
            offset = max(0, min(positions)-250) if positions else 0
            results.append({'note': f'APEX/Conversations/{name}', 'excerpt': content[offset:offset+2500], 'keyword_matches': score})
        return results
