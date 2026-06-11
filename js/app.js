/*
 * Uygulama mantığı — Form1.cs ve diyalogların web portu.
 * Saf DOM; tüm durum localStorage'da tutulur.
 */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const T = function (en, tr) { return window.Loc.T(en, tr); };

  let settings = window.WSStore.loadSettings();
  let saved = window.WSStore.loadSaved();
  let theme = window.WSData.findTheme(settings.themeName);

  // Builder modifier durumu: WSData.MODIFIERS kopyası + mode
  let mods = window.WSData.MODIFIERS.map(function (m) {
    return { label: m.label, pattern: m.pattern, mode: "off" };
  });
  let corruptMode = 0;

  // Builder stat satırı referansları
  let rows = [];           // { prefix, label, isEff, min, max, active, exclude, activeBtn, excludeBtn }
  let suppressBuild = false;

  // ===== Renk yardımcıları =====
  function parseRgb(s) {
    const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  }
  function mix(a, b, ratio) {
    const A = parseRgb(a), B = parseRgb(b);
    return "rgb(" +
      Math.round(A[0] * ratio + B[0] * (1 - ratio)) + "," +
      Math.round(A[1] * ratio + B[1] * (1 - ratio)) + "," +
      Math.round(A[2] * ratio + B[2] * (1 - ratio)) + ")";
  }

  function applyTheme(t) {
    theme = t;
    const r = document.documentElement.style;
    r.setProperty("--back", t.back);
    r.setProperty("--input", t.input);
    r.setProperty("--fore", t.fore);
    r.setProperty("--accent", t.accent);
    r.setProperty("--query", t.query);
    r.setProperty("--muted", mix(t.fore, t.back, 0.6));
    r.setProperty("--badge", mix(t.fore, t.back, 0.7));
    r.setProperty("--tag", mix(t.query, t.fore, 0.7));
    r.setProperty("--border", mix(t.accent, t.fore, 0.55));
    r.setProperty("--hover", mix(t.accent, t.back, 0.25));
    document.documentElement.style.setProperty("color-scheme", t.dark ? "dark" : "light");
  }

  function applyFont(name) {
    document.documentElement.style.setProperty("--ui-font", '"' + name + '", "Segoe UI", sans-serif');
  }

  // ===== Toggle (aç/kapa düğmesi) =====
  function updateToggle(btn, on) {
    btn.classList.toggle("on", on);
  }

  function setActive(row, val) {
    if (row.active === val) return;
    row.active = val;
    updateToggle(row.activeBtn, val);
    if (row.excludeBtn) row.excludeBtn.disabled = !val;
    if (!val && row.exclude) setExclude(row, false);
    else buildQueryFromInputs();
  }

  function setExclude(row, val) {
    if (!row.excludeBtn || row.exclude === val) return;
    row.exclude = val;
    updateToggle(row.excludeBtn, val);
    row.min.disabled = val;
    row.max.disabled = val;
    if (val && !row.active) setActive(row, true);
    else buildQueryFromInputs();
  }

  // ===== Stat satırlarını üret =====
  function buildStatRows() {
    const table = $("statTable");
    const list = window.WSData.STATS.map(function (s) {
      return { label: s.label, prefix: s.prefix, isEff: false };
    });
    list.push({ label: "EFFECTIVENESS", prefix: "effectiveness: ", isEff: true });

    list.forEach(function (item) {
      const allowExclude = item.label !== "WAYSTONE DROP CHANCE";
      const rowEl = document.createElement("div");
      rowEl.className = "stat-row";

      const lbl = document.createElement("span");
      lbl.className = "stat-label";
      lbl.textContent = item.label;

      const min = document.createElement("input");
      min.type = "number"; min.min = 0; min.max = 200; min.value = 0;
      min.className = "num-input";

      const max = document.createElement("input");
      max.type = "number"; max.min = 0; max.max = 199; max.value = 0;
      max.className = "num-input";

      const activeBtn = document.createElement("button");
      activeBtn.className = "toggle"; activeBtn.dataset.kind = "active";

      const excludeBtn = document.createElement("button");
      excludeBtn.className = "toggle"; excludeBtn.dataset.kind = "exclude";
      excludeBtn.disabled = true;
      if (!allowExclude) excludeBtn.classList.add("hidden-cell");

      const row = {
        label: item.label, prefix: item.prefix, isEff: item.isEff,
        min: min, max: max, activeBtn: activeBtn,
        excludeBtn: allowExclude ? excludeBtn : null,
        active: false, exclude: false,
      };

      activeBtn.addEventListener("click", function () { setActive(row, !row.active); });
      if (allowExclude)
        excludeBtn.addEventListener("click", function () {
          if (excludeBtn.disabled) return;
          setExclude(row, !row.exclude);
        });
      min.addEventListener("input", function () { onNum(row); });
      max.addEventListener("input", function () { onNum(row); });

      rowEl.appendChild(lbl);
      rowEl.appendChild(min);
      rowEl.appendChild(max);
      rowEl.appendChild(activeBtn);
      rowEl.appendChild(excludeBtn);
      table.appendChild(rowEl);
      rows.push(row);
    });
  }

  function onNum(row) {
    if (!row.active) setActive(row, true);
    else buildQueryFromInputs();
  }

  function numVal(input) {
    let v = parseInt(input.value, 10);
    if (isNaN(v)) v = 0;
    return Math.max(parseInt(input.min, 10), Math.min(v, parseInt(input.max, 10)));
  }

  // ===== Sorgu üretimi (Form1.BuildQueryFromInputs) =====
  function buildQueryFromInputs() {
    if (suppressBuild) return;
    const R = window.WSRegex;
    const terms = [];

    rows.forEach(function (row) {
      if (!row.active) return;
      if (row.isEff) {
        terms.push(row.exclude ? "!effectiveness" : R.statTerm("effectiveness: ", numVal(row.min), numVal(row.max)));
      } else {
        terms.push(row.exclude ? R.negTerm(row.prefix) : R.statTerm(row.prefix, numVal(row.min), numVal(row.max)));
      }
    });

    mods.forEach(function (m) {
      if (m.mode === "hide") terms.push(R.negTerm(m.pattern));
      else if (m.mode === "only") terms.push('"' + m.pattern + '"');
    });

    if (corruptMode === 1) terms.push("corrupted");
    else if (corruptMode === 2) terms.push("!corrupted");

    $("queryBox").value = terms.join(" ");
    recalculate();
  }

  function clearInputs() {
    suppressBuild = true;
    rows.forEach(function (row) {
      if (row.active) { row.active = false; updateToggle(row.activeBtn, false); }
      if (row.excludeBtn) {
        row.exclude = false; updateToggle(row.excludeBtn, false);
        row.excludeBtn.disabled = true; row.min.disabled = false; row.max.disabled = false;
      }
    });
    mods.forEach(function (m) { m.mode = "off"; });
    corruptMode = 0;
    $("corruptBtn").textContent = corruptText();
    suppressBuild = false;
    $("queryBox").value = "";
    recalculate();
  }

  // ===== Durum / özet (Form1.Recalculate) =====
  function recalculate() {
    const terms = window.WSRegex.parse($("queryBox").value);
    const errors = terms.filter(function (t) { return t.error; });
    const sum = $("summaryLabel");
    const len = $("queryBox").value.length;

    if (errors.length > 0) {
      sum.innerHTML = '<span class="err">' +
        T("⚠ Invalid regex: ", "⚠ Hatalı regex: ") +
        errors.map(function (e) { return "'" + esc(e.pattern) + "' → " + esc(e.error); }).join("; ") + "</span>";
    } else if (terms.length === 0) {
      sum.textContent = T("Pick filters or type a query", "Filtre seç veya sorgu yaz");
    } else {
      let txt = terms.length + " " + T("terms", "terim") + "  •  " + len + " " + T("chars", "karakter");
      sum.textContent = txt;
      if (len > 250) {
        sum.innerHTML = esc(txt) + '<span class="warn">' +
          T("  ⚠ exceeds the in-game 250 char limit!", "  ⚠ oyun içi 250 karakter sınırını aşıyor!") + "</span>";
      }
    }

    const active = mods.filter(function (m) { return m.mode !== "off"; })
      .map(function (m) { return m.label + ": " + (m.mode === "hide" ? T("HIDE", "GİZLE") : T("SHOW", "GÖSTER")); });
    $("modSummaryLabel").textContent = active.length === 0
      ? T("No active modifier filters", "Aktif modifier filtresi yok")
      : T("Active modifier filters:  ", "Aktif modifier filtreleri:  ") + active.join("   |   ");
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function corruptText() {
    const state = corruptMode === 1 ? T("ON", "AÇIK")
      : corruptMode === 2 ? T("HIDE (!)", "GİZLE (!)")
        : T("OFF", "KAPALI");
    return "☠ CORRUPT: " + state;
  }

  // ===== Kopyalama + toast =====
  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* yok */ }
    document.body.removeChild(ta);
  }
  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add("hidden"); }, 1400);
  }

  // ===== Modal altyapısı (iç içe / stacked) =====
  const modalStack = [];
  function openModal(title, buildContent, actions) {
    const root = $("modalRoot");
    if (modalStack.length) modalStack[modalStack.length - 1].style.display = "none";

    const box = document.createElement("div");
    box.className = "modal";
    const h = document.createElement("h2");
    h.textContent = title;
    box.appendChild(h);
    const content = document.createElement("div");
    buildContent(content);
    box.appendChild(content);

    const bar = document.createElement("div");
    bar.className = "modal-actions" + (actions.spread ? " spread" : "");
    actions.buttons.forEach(function (b) {
      const btn = document.createElement("button");
      btn.className = "btn " + (b.accent ? "btn-accent" : "btn-outline");
      btn.textContent = b.text;
      btn.addEventListener("click", function () { b.onClick(closeModal); });
      bar.appendChild(btn);
    });
    box.appendChild(bar);

    root.appendChild(box);
    root.classList.remove("hidden");
    modalStack.push(box);
    return content;
  }
  function closeModal() {
    const box = modalStack.pop();
    if (box) box.remove();
    if (modalStack.length) modalStack[modalStack.length - 1].style.display = "";
    else $("modalRoot").classList.add("hidden");
  }
  $("modalRoot").querySelector(".modal-backdrop").addEventListener("click", function () {
    if (modalStack.length) closeModal();
  });

  // ===== Modifiers diyaloğu =====
  function openModifiers() {
    openModal("WAYSTONE MODIFIERS", function (c) {
      const table = document.createElement("table");
      table.className = "mod-table";
      const thead = document.createElement("thead");
      thead.innerHTML = "<tr><th>MODIFIER</th><th class='center'>" +
        T("HIDE (!)", "GİZLE (!)") + "</th><th class='center'>" + T("SHOW", "GÖSTER") + "</th></tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      mods.forEach(function (m) {
        const tr = document.createElement("tr");
        const td0 = document.createElement("td"); td0.textContent = m.label;
        const td1 = document.createElement("td"); td1.className = "center";
        const td2 = document.createElement("td"); td2.className = "center";
        const hide = document.createElement("input"); hide.type = "checkbox"; hide.checked = m.mode === "hide";
        const only = document.createElement("input"); only.type = "checkbox"; only.checked = m.mode === "only";
        hide.addEventListener("change", function () {
          if (hide.checked) only.checked = false;
          m.mode = hide.checked ? "hide" : (only.checked ? "only" : "off");
          buildQueryFromInputs();
        });
        only.addEventListener("change", function () {
          if (only.checked) hide.checked = false;
          m.mode = only.checked ? "only" : (hide.checked ? "hide" : "off");
          buildQueryFromInputs();
        });
        td1.appendChild(hide); td2.appendChild(only);
        tr.appendChild(td0); tr.appendChild(td1); tr.appendChild(td2);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      c.appendChild(table);
    }, {
      spread: true,
      buttons: [
        { text: T("RESET", "SIFIRLA"), onClick: function (close) {
            mods.forEach(function (m) { m.mode = "off"; });
            buildQueryFromInputs();
            close();
            openModifiers();
          } },
        { text: T("OK", "TAMAM"), accent: true, onClick: function (close) { close(); } },
      ],
    });
  }

  // ===== Kaydetme diyaloğu (isim + etiket) =====
  function promptSave(defaultName, onSave) {
    let selectedTags = [];
    let tagsLbl;
    let nameInput;
    openModal(T("SAVE REGEX", "REGEX'İ KAYDET"), function (c) {
      const f1 = document.createElement("div"); f1.className = "field";
      f1.innerHTML = "<label>" + T("Name:", "İsim:") + "</label>";
      const name = document.createElement("input"); name.type = "text"; name.value = defaultName; name.style.flex = "1";
      nameInput = name;
      f1.appendChild(name); c.appendChild(f1);

      const f2 = document.createElement("div"); f2.className = "field";
      f2.innerHTML = "<label>TAGS</label>";
      tagsLbl = document.createElement("span"); tagsLbl.style.flex = "1";
      tagsLbl.textContent = T("(none)", "(yok)");
      const pick = document.createElement("button"); pick.className = "btn btn-outline btn-sm"; pick.textContent = T("SELECT ▾", "SEÇ ▾");
      pick.addEventListener("click", function () {
        openTagPicker(selectedTags, function (sel) {
          selectedTags = sel;
          tagsLbl.textContent = sel.length === 0 ? T("(none)", "(yok)") : sel.map(function (t) { return "[" + t + "]"; }).join("  ");
        });
      });
      f2.appendChild(tagsLbl); f2.appendChild(pick); c.appendChild(f2);
      c._nameInput = name;
      setTimeout(function () { name.focus(); name.select(); }, 0);
    }, {
      buttons: [
        { text: T("CANCEL", "İPTAL"), onClick: function (close) { close(); } },
        { text: T("SAVE", "KAYDET"), accent: true, onClick: function (close) {
            const nm = nameInput.value.trim();
            if (!nm) return;
            onSave(nm, selectedTags);
            close();
          } },
      ],
    });
  }

  function captureState(name) {
    const s = window.WSStore.newSaved({ name: name });
    s.stats = rows.filter(function (r) { return !r.isEff; }).map(function (r) {
      return { enabled: r.active, min: numVal(r.min), max: numVal(r.max), exclude: r.exclude };
    });
    const eff = rows.filter(function (r) { return r.isEff; })[0];
    s.effectiveness = { enabled: eff.active, min: numVal(eff.min), max: numVal(eff.max), exclude: eff.exclude };
    s.onlyMods = mods.filter(function (m) { return m.mode === "only"; }).map(function (m) { return m.pattern; });
    s.hiddenMods = mods.filter(function (m) { return m.mode === "hide"; }).map(function (m) { return m.pattern; });
    s.corruptMode = corruptMode;
    window.WSStore.rebuildQuery(s);
    return s;
  }

  function saveCurrent() {
    promptSave("Regex " + (saved.length + 1), function (name, tags) {
      const s = captureState(name);
      s.tags = tags;
      saved.push(s);
      window.WSStore.persist(saved);
      renderSaved();
      switchTab("saved");
    });
  }

  // ===== Etiket seçici =====
  function openTagPicker(current, onOk) {
    let checked = current.slice();
    openModal("TAGS", function (c) {
      const list = document.createElement("div"); list.className = "tag-list";
      function rebuild() {
        list.innerHTML = "";
        const all = settings.tags.concat(checked).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
        all.forEach(function (tag) {
          const lab = document.createElement("label");
          const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = checked.indexOf(tag) >= 0;
          cb.addEventListener("change", function () {
            if (cb.checked) { if (checked.indexOf(tag) < 0) checked.push(tag); }
            else checked = checked.filter(function (t) { return t !== tag; });
          });
          lab.appendChild(cb); lab.appendChild(document.createTextNode(tag));
          list.appendChild(lab);
        });
      }
      rebuild();
      c.appendChild(list);
      const add = document.createElement("div"); add.className = "tag-add";
      const inp = document.createElement("input"); inp.type = "text"; inp.className = "text-input";
      const btn = document.createElement("button"); btn.className = "btn btn-outline btn-sm"; btn.textContent = T("ADD", "EKLE");
      btn.addEventListener("click", function () {
        const tag = inp.value.trim().toUpperCase();
        if (!tag) return;
        if (settings.tags.indexOf(tag) < 0) { settings.tags.push(tag); window.WSStore.saveSettings(settings); }
        if (checked.indexOf(tag) < 0) checked.push(tag);
        inp.value = ""; rebuild();
      });
      add.appendChild(inp); add.appendChild(btn); c.appendChild(add);
    }, {
      buttons: [{ text: T("OK", "TAMAM"), accent: true, onClick: function (close) { onOk(checked); close(); } }],
    });
  }

  // ===== Etiket yönetimi =====
  function openTagManager() {
    openModal("TAG SETTINGS", function (c) {
      const list = document.createElement("div"); list.className = "tag-list";
      function rebuild() {
        list.innerHTML = "";
        settings.tags.slice().sort().forEach(function (tag) {
          const row = document.createElement("div"); row.className = "tag-manage-row";
          const span = document.createElement("span"); span.textContent = tag;
          const del = document.createElement("button"); del.className = "del-x"; del.textContent = "✕";
          del.addEventListener("click", function () {
            settings.tags = settings.tags.filter(function (t) { return t !== tag; });
            window.WSStore.saveSettings(settings); rebuild();
          });
          row.appendChild(span); row.appendChild(del); list.appendChild(row);
        });
      }
      rebuild();
      c.appendChild(list);
      const add = document.createElement("div"); add.className = "tag-add";
      const inp = document.createElement("input"); inp.type = "text"; inp.className = "text-input";
      const btn = document.createElement("button"); btn.className = "btn btn-outline btn-sm"; btn.textContent = T("ADD", "EKLE");
      btn.addEventListener("click", function () {
        const tag = inp.value.trim().toUpperCase();
        if (!tag || settings.tags.indexOf(tag) >= 0) return;
        settings.tags.push(tag); window.WSStore.saveSettings(settings); inp.value = ""; rebuild();
      });
      add.appendChild(inp); add.appendChild(btn); c.appendChild(add);
    }, {
      buttons: [{ text: T("OK", "TAMAM"), accent: true, onClick: function (close) { renderSaved(); close(); } }],
    });
  }

  // ===== Tüm verileri temizleme =====
  function openClearDataDialog() {
    openModal(T("⚠ CLEAR ALL DATA", "⚠ TÜM VERİLERİ TEMİZLE"), function (c) {
      const p = document.createElement("p");
      p.style.maxWidth = "420px";
      p.style.lineHeight = "1.6";
      p.textContent = T(
        "This will permanently delete ALL data stored in this browser: every saved regex, your tags, theme, font and language settings. The page will reload as a fresh install. This cannot be undone!",
        "Bu işlem tarayıcıda saklanan TÜM verileri kalıcı olarak siler: bütün kayıtlı regexler, etiketlerin, tema, font ve dil ayarların. Sayfa sıfır kurulum gibi yeniden yüklenecek. Bu işlem geri alınamaz!");
      c.appendChild(p);
      const n = document.createElement("p");
      n.style.fontWeight = "800";
      n.textContent = T("Saved regexes: ", "Kayıtlı regex sayısı: ") + saved.length;
      c.appendChild(n);
    }, {
      spread: true,
      buttons: [
        { text: T("CANCEL", "İPTAL"), onClick: function (close) { close(); } },
        { text: T("🗑 DELETE EVERYTHING", "🗑 HEPSİNİ SİL"), accent: true, onClick: function () {
            try {
              localStorage.removeItem("wsrx.settings");
              localStorage.removeItem("wsrx.saved");
            } catch (e) { /* yok say */ }
            location.reload();
          } },
      ],
    });
  }

  // ===== Kayıt düzenleme diyaloğu (SavedRegexDialog) =====
  function openSavedEditor(item) {
    let tags = item.tags.slice();
    let tagsLbl;
    const statInputs = [];
    const modInputs = [];
    let effInputs, nameBox, corruptSel;

    function tagsText() { return tags.length === 0 ? T("(none)", "(yok)") : tags.map(function (t) { return "[" + t + "]"; }).join("  "); }

    openModal(T("REGEX SETTINGS — ", "REGEX AYARLARI — ") + item.name, function (c) {
      // İsim
      const f = document.createElement("div"); f.className = "field";
      f.innerHTML = "<label>" + T("NAME", "İSİM") + "</label>";
      nameBox = document.createElement("input"); nameBox.type = "text"; nameBox.value = item.name; nameBox.style.flex = "1";
      f.appendChild(nameBox); c.appendChild(f);

      const head = document.createElement("div");
      head.className = "edit-stat-row";
      head.style.opacity = "0.8";
      head.innerHTML = "<span></span><span></span><span>MIN</span><span>MAX</span><span></span>";
      c.appendChild(head);

      // Stat satırları
      const statDefs = window.WSData.STATS.concat([{ label: "EFFECTIVENESS", prefix: "effectiveness: " }]);
      statDefs.forEach(function (def, i) {
        const isEff = i === window.WSData.STATS.length;
        const allowExcl = def.label !== "WAYSTONE DROP CHANCE";
        const s = isEff ? item.effectiveness : (i < item.stats.length ? item.stats[i] : window.WSStore.newStat());

        const rowEl = document.createElement("div"); rowEl.className = "edit-stat-row";
        const lbl = document.createElement("span"); lbl.textContent = def.label; lbl.style.fontWeight = "700"; lbl.style.fontSize = "13px";
        const onLab = document.createElement("label");
        const on = document.createElement("input"); on.type = "checkbox"; on.checked = s.enabled;
        onLab.appendChild(on); onLab.appendChild(document.createTextNode(T("ACTIVE", "AKTİF")));
        const min = document.createElement("input"); min.type = "number"; min.min = 0; min.max = 200; min.value = s.min; min.className = "num-input";
        const max = document.createElement("input"); max.type = "number"; max.min = 0; max.max = 199; max.value = s.max; max.className = "num-input";
        const exLab = document.createElement("label");
        const ex = document.createElement("input"); ex.type = "checkbox"; ex.checked = s.exclude;
        exLab.appendChild(ex); exLab.appendChild(document.createTextNode(T("EXCL (!)", "HARİÇ (!)")));
        if (!allowExcl) exLab.style.visibility = "hidden";
        function applyEx() { min.disabled = ex.checked; max.disabled = ex.checked; }
        ex.addEventListener("change", applyEx); applyEx();

        rowEl.appendChild(lbl); rowEl.appendChild(onLab); rowEl.appendChild(min); rowEl.appendChild(max); rowEl.appendChild(exLab);
        c.appendChild(rowEl);
        const rec = { on: on, min: min, max: max, ex: ex, allowExcl: allowExcl };
        if (isEff) effInputs = rec; else statInputs.push(rec);
      });

      // Modifiers
      const modHead = document.createElement("table"); modHead.className = "mod-table";
      modHead.innerHTML = "<thead><tr><th>MODIFIERS</th><th class='center'>" + T("HIDE (!)", "GİZLE (!)") +
        "</th><th class='center'>" + T("SHOW", "GÖSTER") + "</th></tr></thead>";
      const tb = document.createElement("tbody");
      window.WSData.MODIFIERS.forEach(function (m) {
        const tr = document.createElement("tr");
        const t0 = document.createElement("td"); t0.textContent = m.label;
        const t1 = document.createElement("td"); t1.className = "center";
        const t2 = document.createElement("td"); t2.className = "center";
        const hide = document.createElement("input"); hide.type = "checkbox"; hide.checked = item.hiddenMods.indexOf(m.pattern) >= 0;
        const only = document.createElement("input"); only.type = "checkbox"; only.checked = item.onlyMods.indexOf(m.pattern) >= 0;
        hide.addEventListener("change", function () { if (hide.checked) only.checked = false; });
        only.addEventListener("change", function () { if (only.checked) hide.checked = false; });
        t1.appendChild(hide); t2.appendChild(only);
        tr.appendChild(t0); tr.appendChild(t1); tr.appendChild(t2); tb.appendChild(tr);
        modInputs.push({ hide: hide, only: only, pattern: m.pattern });
      });
      modHead.appendChild(tb); c.appendChild(modHead);

      // Tags
      const ft = document.createElement("div"); ft.className = "field"; ft.style.marginTop = "12px";
      ft.innerHTML = "<label>TAGS</label>";
      tagsLbl = document.createElement("span"); tagsLbl.style.flex = "1"; tagsLbl.textContent = tagsText();
      const pick = document.createElement("button"); pick.className = "btn btn-outline btn-sm"; pick.textContent = T("SELECT ▾", "SEÇ ▾");
      pick.addEventListener("click", function () { openTagPicker(tags, function (sel) { tags = sel; tagsLbl.textContent = tagsText(); }); });
      ft.appendChild(tagsLbl); ft.appendChild(pick); c.appendChild(ft);

      // Corrupt
      const fc = document.createElement("div"); fc.className = "field";
      fc.innerHTML = "<label>CORRUPT</label>";
      corruptSel = document.createElement("select");
      [T("OFF", "KAPALI"), T("ON (corrupted only)", "AÇIK (sadece corrupt)"), T("HIDE (!)", "GİZLE (!)")].forEach(function (txt, i) {
        const o = document.createElement("option"); o.value = i; o.textContent = txt; corruptSel.appendChild(o);
      });
      corruptSel.value = Math.max(0, Math.min(item.corruptMode, 2));
      fc.appendChild(corruptSel); c.appendChild(fc);
    }, {
      spread: true,
      buttons: [
        { text: T("DELETE", "SİL"), onClick: function (close) {
            if (confirm(T("Delete '" + item.name + "'?", "'" + item.name + "' silinsin mi?"))) {
              saved = saved.filter(function (x) { return x !== item; });
              window.WSStore.persist(saved); renderSaved(); close();
            }
          } },
        { text: T("CANCEL", "İPTAL"), onClick: function (close) { close(); } },
        { text: T("SAVE", "KAYDET"), accent: true, onClick: function (close) {
            const nm = nameBox.value.trim();
            if (nm) item.name = nm;
            item.stats = statInputs.map(function (r) {
              return { enabled: r.on.checked, min: numVal(r.min), max: numVal(r.max), exclude: r.ex.checked && r.allowExcl };
            });
            item.effectiveness = { enabled: effInputs.on.checked, min: numVal(effInputs.min), max: numVal(effInputs.max), exclude: effInputs.ex.checked };
            item.onlyMods = modInputs.filter(function (m) { return m.only.checked; }).map(function (m) { return m.pattern; });
            item.hiddenMods = modInputs.filter(function (m) { return m.hide.checked; }).map(function (m) { return m.pattern; });
            item.corruptMode = parseInt(corruptSel.value, 10);
            item.tags = tags;
            window.WSStore.rebuildQuery(item);
            window.WSStore.persist(saved);
            renderSaved(); close();
          } },
      ],
    });
  }

  // ===== Saved sekmesi listesi =====
  function rebuildTagFilter() {
    const sel = $("savedTag");
    const keep = sel.value;
    sel.innerHTML = "";
    const all = [T("ALL", "TÜMÜ")];
    saved.forEach(function (s) { s.tags.forEach(function (t) { if (all.indexOf(t) < 0) all.push(t); }); });
    // ALL ilk, kalanları sıralı
    const tagsOnly = all.slice(1).sort();
    [all[0]].concat(tagsOnly).forEach(function (t, i) {
      const o = document.createElement("option"); o.value = i === 0 ? "__all__" : t; o.textContent = t; sel.appendChild(o);
    });
    sel.value = (keep && Array.prototype.some.call(sel.options, function (o) { return o.value === keep; })) ? keep : "__all__";
  }

  function rebuildSortItems() {
    const sel = $("savedSort");
    const keep = sel.selectedIndex < 0 ? 0 : sel.selectedIndex;
    sel.innerHTML = "";
    [T("Name", "İsim"), "ITEM RARITY", "PACK SIZE", "MONSTER RARITY", "WAYSTONE DROP CHANCE", "EFFECTIVENESS"]
      .forEach(function (txt) { const o = document.createElement("option"); o.textContent = txt; sel.appendChild(o); });
    sel.selectedIndex = Math.min(keep, sel.options.length - 1);
  }

  function filteredSaved() {
    let list = saved.slice();
    const tagVal = $("savedTag").value;
    if (tagVal && tagVal !== "__all__")
      list = list.filter(function (s) { return s.tags.indexOf(tagVal) >= 0; });

    const q = $("savedSearch").value.trim().toLowerCase();
    if (q)
      list = list.filter(function (s) {
        return s.name.toLowerCase().indexOf(q) >= 0 ||
          s.query.toLowerCase().indexOf(q) >= 0 ||
          s.tags.some(function (t) { return t.toLowerCase().indexOf(q) >= 0; });
      });

    const sort = $("savedSort").selectedIndex;
    const S = window.WSStore;
    if (sort >= 1 && sort <= 4)
      list.sort(function (a, b) { return S.statSortValue(b, sort - 1) - S.statSortValue(a, sort - 1); });
    else if (sort === 5)
      list.sort(function (a, b) { return S.effSortValue(b) - S.effSortValue(a); });
    else
      list.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
    return list;
  }

  function renderSaved() {
    rebuildTagFilter();
    const S = window.WSStore;
    const cont = $("savedList");
    cont.innerHTML = "";

    if (saved.length === 0) {
      const note = document.createElement("div"); note.className = "empty-note";
      note.textContent = T("No saved regexes yet. Use 💾 SAVE REGEX in the builder.", "Henüz kayıt yok. Oluşturucudan 💾 REGEX'İ KAYDET ile ekle.");
      cont.appendChild(note);
      return;
    }

    filteredSaved().forEach(function (item) {
      const card = document.createElement("div"); card.className = "saved-card";

      const top = document.createElement("div"); top.className = "card-top";
      const name = document.createElement("span"); name.className = "name"; name.textContent = item.name;
      top.appendChild(name);
      if (item.tags.length) {
        const tg = document.createElement("span"); tg.className = "tags";
        tg.textContent = item.tags.map(function (t) { return "[" + t + "]"; }).join("  ");
        top.appendChild(tg);
      }
      card.appendChild(top);

      const badges = document.createElement("div"); badges.className = "badges";
      badges.textContent = "IR " + S.statBadge(item, 0) + "    PS " + S.statBadge(item, 1) +
        "    MR " + S.statBadge(item, 2) + "    DROP " + S.statBadge(item, 3) + "    EFF " + S.effBadge(item);
      card.appendChild(badges);

      const query = document.createElement("div"); query.className = "query";
      query.textContent = item.query.length === 0 ? "—" : item.query;
      card.appendChild(query);

      const actions = document.createElement("div"); actions.className = "card-actions";
      actions.appendChild(mkBtn(T("COPY", "KOPYALA"), true, function () { if (item.query) { copyText(item.query); toast(T("Copied!", "Kopyalandı!")); } }));
      actions.appendChild(mkBtn(T("SHOW", "GÖSTER"), false, function () { $("queryBox").value = item.query; switchTab("builder"); recalculate(); }));
      actions.appendChild(mkBtn(T("EXPORT", "İNDİR"), false, function () { exportSaved(item); }));
      actions.appendChild(mkBtn("⚙", false, function () { openSavedEditor(item); }));
      card.appendChild(actions);

      // REACH kaydırıcısı
      const reach = document.createElement("div"); reach.className = "reach";
      const rlbl = document.createElement("label");
      const bar = document.createElement("input"); bar.type = "range"; bar.min = 0; bar.max = 20; bar.step = 1;
      bar.value = Math.max(0, Math.min(item.relax || 0, 20));
      function updLbl() { rlbl.textContent = T("REACH -" + bar.value + "%", "ERİŞİM -%" + bar.value); }
      updLbl();
      bar.addEventListener("input", function () {
        item.relax = parseInt(bar.value, 10);
        S.rebuildQuery(item);
        query.textContent = item.query.length === 0 ? "—" : item.query;
        updLbl();
      });
      bar.addEventListener("change", function () { window.WSStore.persist(saved); });
      reach.appendChild(rlbl); reach.appendChild(bar);
      card.appendChild(reach);

      cont.appendChild(card);
    });
  }

  function mkBtn(text, accent, onClick) {
    const b = document.createElement("button");
    b.className = "btn btn-sm " + (accent ? "btn-accent" : "btn-outline");
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  // ===== Dosya paylaşımı (.wsrx) =====
  function exportSaved(item) {
    const clean = {
      name: item.name, stats: item.stats, effectiveness: item.effectiveness,
      onlyMods: item.onlyMods, hiddenMods: item.hiddenMods, corruptMode: item.corruptMode,
      tags: item.tags, relax: item.relax, query: item.query,
    };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = item.name.replace(/[\\/:*?"<>|]/g, "_") + ".wsrx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importFiles(fileList) {
    const files = Array.prototype.slice.call(fileList);
    let pending = files.length;
    let added = 0;
    const failed = [];
    if (pending === 0) return;
    files.forEach(function (file) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(function (o) {
            if (o && (o.name || o.query || (o.stats && o.stats.length))) {
              const s = window.WSStore.normalize(o);
              window.WSStore.rebuildQuery(s);
              saved.push(s); added++;
            }
          });
        } catch (e) { failed.push(file.name); }
        if (--pending === 0) finish();
      };
      reader.onerror = function () { failed.push(file.name); if (--pending === 0) finish(); };
      reader.readAsText(file);
    });
    function finish() {
      if (added > 0) { window.WSStore.persist(saved); renderSaved(); switchTab("saved"); }
      if (failed.length) alert(T("Could not read: ", "Okunamayan dosyalar: ") + failed.join(", "));
    }
  }

  // ===== Dil uygulaması =====
  function applyLanguage() {
    $("tabs").querySelector('[data-tab=builder]').textContent = T("REGEX BUILDER", "REGEX OLUŞTURUCU");
    $("tabs").querySelector('[data-tab=saved]').textContent = T("SAVED REGEXES", "KAYDEDİLMİŞ REGEXLER");
    $("tabs").querySelector('[data-tab=settings]').textContent = T("SETTINGS", "AYARLAR");

    $("outLabel").textContent = T("GENERATED REGEX — paste into the in-game search box", "OLUŞTURULAN REGEX — oyundaki arama kutusuna yapıştır");
    $("copyBtn").textContent = T("📋 COPY", "📋 KOPYALA");
    $("clearBtn").textContent = T("CLEAR", "TEMİZLE");
    $("hintLabel").textContent = T(
      "MIN = lowest value to match; MAX optional (0 = no upper limit). E.g. 20–45 matches +20%..+45%",
      "MIN = eşleşecek en düşük değer; MAX isteğe bağlı (0 = üst sınır yok). Örn. 20–45 → +20%..+45% arası eşleşir");
    $("corruptBtn").textContent = corruptText();
    $("saveBtn").textContent = T("💾  SAVE REGEX", "💾  REGEX'İ KAYDET");

    $("themeLbl").textContent = T("THEME", "TEMA");
    $("fontLbl").textContent = "FONT";
    $("langLbl").textContent = T("LANGUAGE", "DİL");
    $("sortLbl").textContent = T("SORT:", "SIRALA:");
    $("importBtn").textContent = T("📂 LOAD FROM FILE", "📂 DOSYADAN YÜKLE");
    $("tagSettingsBtn").textContent = "🏷 TAG SETTINGS";
    $("clearDataBtn").textContent = T("🗑 CLEAR ALL DATA", "🗑 TÜM VERİLERİ TEMİZLE");
    $("disclaimer").textContent = T(
      "Unofficial fan-made tool. Not affiliated with Grinding Gear Games. Path of Exile and Path of Exile 2 are trademarks of Grinding Gear Games. MIT-style free use. Data is stored locally in your browser.",
      "Resmi olmayan bir hayran aracı. Grinding Gear Games ile bağlantılı değildir. Path of Exile ve Path of Exile 2, Grinding Gear Games'in ticari markalarıdır. Serbest kullanım. Veriler tarayıcında yerel olarak saklanır.");

    rows.forEach(function (r) {
      r.activeBtn.textContent = T("ACTIVE", "AKTİF");
      if (r.excludeBtn) r.excludeBtn.textContent = T("EXCLUDE (!)", "HARİÇ TUT (!)");
    });

    rebuildSortItems();
    renderSaved();
    recalculate();
  }

  // ===== Sekme geçişi =====
  function switchTab(name) {
    Array.prototype.forEach.call($("tabs").children, function (b) {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    ["builder", "saved", "settings"].forEach(function (n) {
      $("panel-" + n).classList.toggle("active", n === name);
    });
  }

  // ===== Kurulum =====
  function init() {
    window.Loc.turkish = settings.turkish;
    applyTheme(theme);
    applyFont(settings.font);

    buildStatRows();

    // Seleler
    const themeSel = $("themeSelect");
    window.WSData.THEMES.forEach(function (t) { const o = document.createElement("option"); o.value = t.name; o.textContent = t.name; themeSel.appendChild(o); });
    themeSel.value = settings.themeName;
    themeSel.addEventListener("change", function () {
      const t = window.WSData.findTheme(themeSel.value);
      settings.themeName = t.name; settings.dark = t.dark;
      window.WSStore.saveSettings(settings);
      applyTheme(t);
    });

    const fontSel = $("fontSelect");
    window.WSData.FONTS.forEach(function (f) { const o = document.createElement("option"); o.value = f; o.textContent = f; fontSel.appendChild(o); });
    fontSel.value = window.WSData.FONTS.indexOf(settings.font) >= 0 ? settings.font : window.WSData.FONTS[0];
    fontSel.addEventListener("change", function () {
      settings.font = fontSel.value; window.WSStore.saveSettings(settings); applyFont(settings.font);
    });

    const langSel = $("langSelect");
    langSel.value = settings.turkish ? "tr" : "en";
    langSel.addEventListener("change", function () {
      window.Loc.turkish = langSel.value === "tr";
      settings.turkish = window.Loc.turkish;
      window.WSStore.saveSettings(settings);
      applyLanguage();
    });

    // Tab tıklamaları
    Array.prototype.forEach.call($("tabs").children, function (b) {
      b.addEventListener("click", function () { switchTab(b.dataset.tab); });
    });

    // Builder olayları
    $("queryBox").addEventListener("input", recalculate);
    $("copyBtn").addEventListener("click", function () {
      const v = $("queryBox").value;
      if (!v) return;
      copyText(v);
      const btn = $("copyBtn");
      btn.classList.add("copied");
      btn.textContent = T("✔ COPIED!", "✔ KOPYALANDI!");
      setTimeout(function () { btn.classList.remove("copied"); btn.textContent = T("📋 COPY", "📋 KOPYALA"); }, 900);
    });
    $("clearBtn").addEventListener("click", clearInputs);
    $("modsBtn").addEventListener("click", openModifiers);
    $("corruptBtn").addEventListener("click", function () {
      corruptMode = (corruptMode + 1) % 3;
      $("corruptBtn").textContent = corruptText();
      buildQueryFromInputs();
    });
    $("saveBtn").addEventListener("click", saveCurrent);

    // Saved sekmesi olayları
    $("savedSearch").addEventListener("input", renderSaved);
    $("savedTag").addEventListener("change", renderSaved);
    $("savedSort").addEventListener("change", renderSaved);
    $("importBtn").addEventListener("click", function () { $("fileInput").click(); });
    $("fileInput").addEventListener("change", function () { importFiles(this.files); this.value = ""; });

    // Sürükle-bırak ile içe aktarma
    const savedPanel = $("panel-saved");
    savedPanel.addEventListener("dragover", function (e) { e.preventDefault(); });
    savedPanel.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
    });

    // Ayarlar
    $("tagSettingsBtn").addEventListener("click", openTagManager);
    $("clearDataBtn").addEventListener("click", openClearDataDialog);

    rebuildSortItems();
    applyLanguage();
    renderSaved();
    recalculate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
