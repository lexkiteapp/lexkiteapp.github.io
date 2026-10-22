/* Embed facade probe for the NATIVE apps (Capacitor WKWebView / Android WebView) – injected ONLY into CI test builds
 * (ios-e2e.yml via scripts/test/ios-e2e/inject.sh, android.yml "lexkite-e2e.apk"), never into release builds. No account, no sign-in.
 * Checks: poster card renders with 0 YouTube requests · tap → youtube-nocookie iframe (playsinline=1, rel=0, loading=lazy) or self-hosted fallback ≤ 4 s
 * · blocked region → self-hosted immediately · no long task > 50 ms right after the tap. Result: console "E2E-VF {json}" (logcat / syslog) + Documents/e2e/facade.json. */
(function () {
  const W = window, sleep = ms => new Promise(r => setTimeout(r, ms));
  const yt = () => performance.getEntriesByType('resource').filter(e => /youtube|ytimg|googlevideo/.test(e.name)).length;
  const load = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  async function run() {
    await sleep(8000);
    const out = { ok: false, platform: (W.Capacitor && W.Capacitor.getPlatform && W.Capacitor.getPlatform()) || 'web', checks: {} };
    try {
      if (!W.LkVideoRank) await load('js/lib/video-rank.js');
      if (!W.LessonVideo) await load('js/lesson-video.js');
      const LV = W.LessonVideo; if (!LV) throw new Error('lesson-video.js not loaded');
      const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:-9999px;top:0;width:360px'; document.body.appendChild(box);
      const poster = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="16"><rect width="9" height="16" fill="#123"/></svg>');
      const items = await LV.manifest().catch(() => []), self = (items.find(x => x.src) || {}).src || 'https://media.lexkite.com/video/missing.mp4';
      const it = { id: 'e2e-vf', title: 'E2E facade', youtube_id: 'M7lc1UVf-VE', poster, src: self, duration: 20, quiz: { q: 'Q?', options: ['A', 'B'], answer: 0 } };
      const base = yt(), slot = document.createElement('div'); slot.className = 'lv-slot'; box.appendChild(slot);
      LV.play(slot, Object.assign({}, it, { youtube_id: '' }), {}); // self-hosted path renders
      out.checks.self_video = !!slot.querySelector('video');
      const s2 = document.createElement('div'); box.appendChild(s2);
      out.checks.zero_yt_before_tap = yt() === base;
      let long = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) long = Math.max(long, e.duration); }).observe({ type: 'longtask' }); } catch (e) { long = -1; }
      LV.play(s2, it, {}); await sleep(LV.YT_WAIT + 1500);
      const fr = s2.querySelector('iframe'), v = s2.querySelector('video');
      out.checks.iframe_ok = !!fr && /youtube-nocookie\.com\/embed\//.test(fr.src) && /playsinline=1/.test(fr.src) && /rel=0/.test(fr.src) && fr.getAttribute('loading') === 'lazy';
      out.checks.fallback = !!v; out.fallback_why = LV.lastFallback || '';
      out.checks.played = out.checks.iframe_ok || out.checks.fallback;
      out.long_task_ms = long; out.checks.no_long_task = long <= 50;
      out.blocked_region = LV.ytBlocked();
      out.ok = out.checks.self_video && out.checks.zero_yt_before_tap && out.checks.played && out.checks.no_long_task !== false;
      box.remove();
    } catch (e) { out.error = String(e && e.message || e).slice(0, 200); }
    console.log('E2E-VF ' + JSON.stringify(out));
    try { const FS = W.Capacitor && W.Capacitor.Plugins && W.Capacitor.Plugins.Filesystem; if (FS) await FS.writeFile({ path: 'e2e/facade.json', data: JSON.stringify(out), directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }); } catch (e) { /* log line is enough */ }
  }
  if (document.readyState === 'complete') run(); else W.addEventListener('load', run, { once: true });
})();
