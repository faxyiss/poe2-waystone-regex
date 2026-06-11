/*
 * Sabit veri: waystone stat satırları, modifier havuzu, temalar.
 * (SavedRegex.cs WaystoneStats, ModifierState.cs, Themes.cs portu.)
 */
(function (global) {
  "use strict";

  // 0.5 yaması waystone stat satırları (tek doğruluk kaynağı).
  const STATS = [
    { label: "ITEM RARITY",          prefix: "m rarity: " },
    { label: "PACK SIZE",            prefix: "size: " },
    { label: "MONSTER RARITY",       prefix: "r rarity: " },
    { label: "WAYSTONE DROP CHANCE", prefix: "chance: " },
  ];

  // Oyun terimleri — dilden bağımsız, her zaman İngilizce.
  const MODIFIERS = [
    { label: "Extra Chaos Damage",         pattern: "extra chaos" },
    { label: "Extra Fire Damage",          pattern: "extra fire" },
    { label: "Extra Cold Damage",          pattern: "extra cold" },
    { label: "Extra Lightning Damage",     pattern: "extra lightning" },
    { label: "Reduced Player Resistances", pattern: "maximum player resistances" },
    { label: "Less Recovery (Life/ES)",    pattern: "less recovery" },
    { label: "Temporal Chains",            pattern: "temporal chains" },
    { label: "Enfeeble",                   pattern: "enfeeble" },
    { label: "Additional Projectiles",     pattern: "additional projectiles" },
    { label: "Increased Monster Speed",    pattern: "movement speed" },
    { label: "Critical Hits",              pattern: "critical" },
    { label: "Reduced Flask Charges",      pattern: "flask charges" },
  ];

  function rgb(r, g, b) { return "rgb(" + r + "," + g + "," + b + ")"; }

  // Themes.cs paletleri. dark: koyu tema mi.
  const THEMES = [
    { name: "WAYSTONE",    dark: true,  back: rgb(34,24,18),    input: rgb(44,32,24),  fore: rgb(235,215,185), accent: rgb(160,30,30),   query: rgb(255,170,60) },
    { name: "BREACH",      dark: true,  back: rgb(26,18,36),    input: rgb(38,28,52),  fore: rgb(225,210,240), accent: rgb(120,45,170),  query: rgb(205,130,255) },
    { name: "ABYSS",       dark: true,  back: rgb(14,26,20),    input: rgb(22,38,30),  fore: rgb(200,230,210), accent: rgb(28,110,65),   query: rgb(95,220,145) },
    { name: "EXPEDITION",  dark: true,  back: rgb(15,23,40),    input: rgb(23,33,56),  fore: rgb(200,215,240), accent: rgb(40,90,180),   query: rgb(110,175,255) },
    { name: "VAAL TEMPLE", dark: true,  back: rgb(38,22,12),    input: rgb(52,30,16),  fore: rgb(240,220,170), accent: rgb(180,45,30),   query: rgb(255,200,60) },
    { name: "DELIRIUM",    dark: true,  back: rgb(38,38,42),    input: rgb(54,54,60),  fore: rgb(228,228,233), accent: rgb(120,120,135), query: rgb(240,240,248) },
    { name: "RITUAL",      dark: true,  back: rgb(30,12,12),    input: rgb(44,18,18),  fore: rgb(235,200,200), accent: rgb(170,30,40),   query: rgb(255,95,95) },
    { name: "DARK",        dark: true,  back: rgb(32,32,36),    input: rgb(46,46,52),  fore: rgb(225,225,225), accent: rgb(95,95,110),   query: rgb(255,200,90) },
    { name: "LIGHT",       dark: false, back: rgb(246,246,248), input: rgb(255,255,255), fore: rgb(40,40,45),  accent: rgb(178,34,34),   query: rgb(140,70,10) },
    { name: "UBER DARK",   dark: true,  back: rgb(10,10,12),    input: rgb(18,18,22),  fore: rgb(200,200,205), accent: rgb(70,70,80),    query: rgb(235,235,240) },
  ];

  const FONTS = ["Bahnschrift", "Segoe UI", "Verdana", "Tahoma", "Arial", "Calibri", "Trebuchet MS"];

  global.WSData = {
    STATS: STATS,
    MODIFIERS: MODIFIERS,
    THEMES: THEMES,
    FONTS: FONTS,
    findTheme: function (name) {
      for (let i = 0; i < THEMES.length; i++) if (THEMES[i].name === name) return THEMES[i];
      return THEMES[0];
    },
  };
})(window);
