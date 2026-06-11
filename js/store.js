/*
 * Kalıcı saklama ve SavedRegex modeli (SavedRegex.cs + AppSettings portu).
 * Masaüstündeki %AppData% yerine tarayıcı localStorage kullanılır.
 * .wsrx paylaşımı dosya indir/yükle ile yapılır.
 */
(function (global) {
  "use strict";

  const SETTINGS_KEY = "wsrx.settings";
  const SAVED_KEY = "wsrx.saved";

  // ---- Ayarlar (AppSettings) ----
  function defaultSettings() {
    return {
      dark: true,
      themeName: "WAYSTONE",
      font: "Bahnschrift",
      turkish: false,
      tags: ["SIMULACRUM", "BOSS RUSH", "JUICE"],
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return Object.assign(defaultSettings(), JSON.parse(raw));
    } catch (e) { /* yok say */ }
    return defaultSettings();
  }

  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* kota */ }
  }

  // ---- SavedRegex modeli ----
  function newStat(over) {
    return Object.assign({ enabled: false, min: 0, max: 0, exclude: false }, over || {});
  }

  function newSaved(over) {
    const s = {
      name: "",
      stats: [],
      effectiveness: newStat(),
      onlyMods: [],
      hiddenMods: [],
      corruptMode: 0,
      tags: [],
      relax: 0,
      query: "",
    };
    return Object.assign(s, over || {});
  }

  // Eksik alanları olan (dışarıdan gelen) kaydı normalize eder.
  function normalize(o) {
    const s = newSaved(o);
    s.stats = (s.stats || []).map(function (st) { return newStat(st); });
    s.effectiveness = newStat(s.effectiveness);
    s.onlyMods = s.onlyMods || [];
    s.hiddenMods = s.hiddenMods || [];
    s.tags = s.tags || [];
    s.corruptMode = s.corruptMode || 0;
    s.relax = Math.max(0, Math.min(s.relax || 0, 20));
    return s;
  }

  // Relax oranı uygulanmış minimum (%20 → 30 yerine 24).
  function relaxedMin(saved, min) {
    if (saved.relax <= 0) return min;
    const r = Math.min(saved.relax, 20);
    return Math.max(0, Math.round(min * (100 - r) / 100));
  }

  // Ayarlardan sorgu metnini yeniden üretir (Relax dahil).
  function rebuildQuery(saved) {
    const R = global.WSRegex;
    const stats = global.WSData.STATS;
    const terms = [];
    for (let i = 0; i < saved.stats.length && i < stats.length; i++) {
      const s = saved.stats[i];
      if (!s.enabled) continue;
      const prefix = stats[i].prefix;
      terms.push(s.exclude ? R.negTerm(prefix) : R.statTerm(prefix, relaxedMin(saved, s.min), s.max));
    }
    const eff = saved.effectiveness;
    if (eff.enabled)
      terms.push(eff.exclude ? "!effectiveness" : R.statTerm("effectiveness: ", relaxedMin(saved, eff.min), eff.max));
    saved.onlyMods.forEach(function (p) { terms.push('"' + p + '"'); });
    saved.hiddenMods.forEach(function (p) { terms.push(R.negTerm(p)); });
    if (saved.corruptMode === 1) terms.push("corrupted");
    else if (saved.corruptMode === 2) terms.push("!corrupted");
    saved.query = terms.join(" ");
    return saved.query;
  }

  function badge(s) {
    if (!s || !s.enabled) return "—";
    if (s.exclude) return "!";
    return s.max > 0 ? (s.min + "-" + s.max) : (s.min + "+");
  }

  function statBadge(saved, index) {
    return badge(index < saved.stats.length ? saved.stats[index] : null);
  }
  function effBadge(saved) { return badge(saved.effectiveness); }

  function sortValue(s) {
    if (!s || !s.enabled) return -1;
    return s.exclude ? -2 : s.min;
  }
  function statSortValue(saved, index) {
    return sortValue(index < saved.stats.length ? saved.stats[index] : null);
  }
  function effSortValue(saved) { return sortValue(saved.effectiveness); }

  // ---- Liste kalıcılığı ----
  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(function (o) { const s = normalize(o); rebuildQuery(s); return s; });
      }
    } catch (e) { /* yok say */ }
    return [];
  }

  function persist(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* kota */ }
  }

  global.WSStore = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    defaultSettings: defaultSettings,
    newStat: newStat,
    newSaved: newSaved,
    normalize: normalize,
    rebuildQuery: rebuildQuery,
    statBadge: statBadge,
    effBadge: effBadge,
    statSortValue: statSortValue,
    effSortValue: effSortValue,
    loadSaved: loadSaved,
    persist: persist,
  };
})(window);
