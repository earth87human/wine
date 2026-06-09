/* ============================================================
   產區地圖 — 義大利 20 區「探索清單」(ledger)
   依北/中/南＋離島分組，標出每區的三種狀態並列出你喝過的酒。
   狀態：tasted 已品飲（有評分）/ cellar 待品飲（有酒未評分）/ unexplored 未探索（無收藏）
   ============================================================ */

import { ITALY_REGIONS, ITALY_ZONE_GROUPS } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

const stateOf = (wines) => !wines || !wines.length
  ? 'unexplored'
  : (wines.some(w => w.rating != null) ? 'tasted' : 'cellar');

const STATE_ORDER = { tasted: 0, cellar: 1, unexplored: 2 };
const STATE_MARK  = { tasted: '★', cellar: '◌', unexplored: '·' };
const STATE_ZH    = { tasted: '已品飲', cellar: '待品飲', unexplored: '未探索' };

export function renderRegions(drinks) {
  const zonesEl = $('#regions-zones');
  const summaryEl = $('#regions-summary');
  if (!zonesEl) return;

  // 只看義大利（有 region_key 的）酒款，依產區歸戶
  const byRegion = {};
  drinks.forEach(d => {
    if (!d.region_key) return;
    (byRegion[d.region_key] ||= []).push(d);
  });

  const total = ITALY_REGIONS.length;
  let entered = 0, tasted = 0;
  ITALY_REGIONS.forEach(r => {
    const st = stateOf(byRegion[r.key]);
    if (st !== 'unexplored') entered++;
    if (st === 'tasted') tasted++;
  });

  if (summaryEl) {
    summaryEl.innerHTML = `
      <span class="regions__stat"><b>${tasted}</b> 已品飲</span>
      <span class="regions__stat"><b>${entered}</b> 已踏入</span>
      <span class="regions__stat regions__stat--mute"><b>${total}</b> 全區</span>
      <span class="regions__legend">
        <i class="region__mark region__mark--tasted">★</i>已品飲
        <i class="region__mark region__mark--cellar">◌</i>待品飲
        <i class="region__mark region__mark--unexplored">·</i>未探索
      </span>`;
  }

  zonesEl.innerHTML = ITALY_ZONE_GROUPS.map(g => {
    const regions = ITALY_REGIONS.filter(r => g.zones.includes(r.zone));
    const gEntered = regions.filter(r => stateOf(byRegion[r.key]) !== 'unexplored').length;

    const rows = regions
      .map(r => {
        const wines = (byRegion[r.key] || []).slice()
          .sort((a, b) => (a.rating == null) - (b.rating == null)); // 已評分排前
        return { r, wines, st: stateOf(wines) };
      })
      .sort((a, b) => STATE_ORDER[a.st] - STATE_ORDER[b.st])
      .map(({ r, wines, st }) => {
        const detail = st === 'unexplored'
          ? `<span class="region__hint">${(r.wines || []).slice(0, 3).map(esc).join(' · ')}</span>`
          : `<span class="region__wines">${wines.map(w =>
              `<button type="button" class="region__chip" data-wine-id="${esc(w.id)}" title="${esc(w.name_en)}">${esc(w.name_en)}</button>`
            ).join('')}</span>`;
        return `
          <li class="region region--${st}" title="${esc(r.note)}">
            <span class="region__mark region__mark--${st}" aria-hidden="true">${STATE_MARK[st]}</span>
            <span class="region__name" lang="it">${esc(r.name_it)}<em lang="zh-Hant">${esc(r.name_zh)}</em></span>
            <span class="sr-only">（${STATE_ZH[st]}）</span>
            ${detail}
          </li>`;
      }).join('');

    return `
      <section class="regions__zone">
        <header class="regions__zone-head">
          <h3 lang="it">${esc(g.it)} <em lang="zh-Hant">${esc(g.zh)}</em></h3>
          <span class="regions__zone-count"><b>${gEntered}</b>/${regions.length}</span>
        </header>
        <ul class="regions__list">${rows}</ul>
      </section>`;
  }).join('');
}
