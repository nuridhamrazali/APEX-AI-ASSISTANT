import contextlib
import importlib
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'bridge'))
from vault import Vault
from hermes_runner import run

class VaultTests(unittest.TestCase):
    def test_persistence_recall_edit_delete(self):
        with tempfile.TemporaryDirectory() as root:
            v = Vault(root)
            note = v.start('Project Blue Lantern. Bahasa Melayu: ingat nama ini.')
            v.finish(note, 'Saved. ' + 'Full answer. '*2000)
            fresh = Vault(root)
            self.assertIn('Full answer. '*2000, note.read_text())
            self.assertIn('Blue Lantern', fresh.search('Blue Lantern')[0]['excerpt'])
            note.write_text('Updated project is Green Lantern', encoding='utf-8')
            self.assertIn('Green Lantern', fresh.search('Green')[0]['excerpt'])
            note.unlink()
            self.assertEqual(fresh.search('Green'), [])

    def test_bridge_uses_harness_and_saves(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root, 'run_agent.py').touch()
            calls = {}
            class Agent:
                def __init__(self, **kw): calls.update(kw)
                def run_conversation(self, **kw):
                    calls['turn'] = kw
                    return {'final_response': 'I remember Blue Lantern.'}
            registry = types.SimpleNamespace(register=lambda **kw: calls.update(tool=kw))
            modules = {'run_agent': types.SimpleNamespace(AIAgent=Agent), 'tools.registry': types.SimpleNamespace(registry=registry)}
            with patch.dict(sys.modules, modules), patch.dict(os.environ, {'HERMES_SOURCE_DIR':root,'OBSIDIAN_VAULT_PATH':root,'GEMINI_API_KEY':'fake'}):
                result = run({'prompt':'Remember Blue Lantern', 'history':[], 'system':'Be helpful.'})
                self.assertTrue(result['memorySaved'])
                self.assertEqual(calls['enabled_toolsets'], ['apex_obsidian'])
                self.assertIn('I remember Blue Lantern.', Path(root,result['memoryNote']).read_text())
                self.assertEqual(calls['tool']['name'], 'apex_obsidian_search')

if __name__ == '__main__': unittest.main()
