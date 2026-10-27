// asr-worker.js — on-device speech recognition for 베어쌤 복습.
// Runs Moonshine (base, int8) with Transformers.js inside this worker, so audio never leaves the device.
// The model (~65 MB) and runtime (~22 MB) download once and are cached by the browser.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;
try { env.backends.onnx.wasm.numThreads = 1; } catch (e) { /* older builds */ }

const MODEL = 'onnx-community/moonshine-base-ONNX';
const files = {};
let asrPromise = null;

function report(p) {
  if (!p || !p.file) return;
  if (p.status !== 'progress' && p.status !== 'done') return;
  const f = files[p.file] || (files[p.file] = { loaded: 0, total: 0 });
  if (p.total) f.total = p.total;
  f.loaded = p.status === 'done' ? (f.total || f.loaded) : (p.loaded || 0);
  let loaded = 0, total = 0;
  for (const k in files) { loaded += files[k].loaded; total += files[k].total; }
  self.postMessage({ type: 'progress', loaded, total });
}

function load() {
  if (!asrPromise) {
    asrPromise = pipeline('automatic-speech-recognition', MODEL, {
      device: 'wasm',
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
      progress_callback: report,
    }).catch((err) => { asrPromise = null; throw err; });
  }
  return asrPromise;
}

self.onmessage = async (event) => {
  const m = event.data || {};
  if (m.type === 'load') {
    try { await load(); self.postMessage({ type: 'ready' }); }
    catch (err) { self.postMessage({ type: 'load-error', error: String((err && err.message) || err) }); }
    return;
  }
  if (m.type === 'run') {
    try {
      const asr = await load();
      const secs = m.audio.length / 16000;
      // Moonshine's default caps output at 6 tokens per whole second, which cuts short clips; allow more.
      const out = await asr(m.audio, { max_new_tokens: Math.max(12, Math.ceil(secs * 7) + 6) });
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : ((out && out.text) || '');
      self.postMessage({ type: 'result', id: m.id, text: text.trim() });
    } catch (err) {
      self.postMessage({ type: 'error', id: m.id, error: String((err && err.message) || err) });
    }
  }
};
