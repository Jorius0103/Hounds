/* =====================================================================
   Hounds — Aba Magias (Mundo › Magias)
   Script clássico: as declarações de nível superior são globais e
   compartilhadas com os outros arquivos. A ordem de carregamento está
   no fim do index.html.
   ===================================================================== */
'use strict';

/* =====================================================================
   Magias de GURPS
   Base de dados com magias do Basic Set e Magic Volumes 1-5.
   Permissão:
     - Jogador: apenas busca e visualização das fichas.
     - Mestre: criar, editar, excluir e alternar visibilidade.
   ===================================================================== */

var GURPS_COLLEGES = [
  'Air', 'Animal', 'Body Control', 'Communication and Empathy', 'Earth',
  'Enchantment', 'Fire', 'Food', 'Gate', 'Healing', 'Illusion and Creation',
  'Knowledge', 'Light and Darkness', 'Making and Breaking', 'Meta-Spells',
  'Mind Control', 'Movement', 'Necromantic', 'Plant', 'Protection and Warning',
  'Sound', 'Technological', 'Water', 'Weather'
];

var GURPS_CLASSES = [
  'Regular', 'Area', 'Missile', 'Blocking', 'Information', 'Enchantment',
  'Special', 'Melee'
];

function spellColleges() {
  var set = {};
  GURPS_COLLEGES.forEach(function (c) { set[c] = true; });
  (W.spells || []).forEach(function (s) {
    if (!s.college) return;
    s.college.split(',').forEach(function (part) {
      var trimmed = part.trim();
      if (trimmed) set[trimmed] = true;
    });
  });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

function spellClasses() {
  var set = {};
  GURPS_CLASSES.forEach(function (c) { set[c] = true; });
  (W.spells || []).forEach(function (s) {
    if (s.class) set[s.class.trim()] = true;
  });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

function renderSpellsPage() {
  var ui = S.ui;
  ui.q = ui.q || '';
  ui.college = ui.college || '';
  ui.spellClass = ui.spellClass || '';
  ui.difficulty = ui.difficulty || '';
  ui.limit = ui.limit || 60;

  var can = isMestre();
  var colleges = spellColleges();
  var classes = spellClasses();

  var head = crumbsHtml('spells') +
    '<div class="head-row"><div>' +
    '<h1>' + svg(ICON.spell, 24, 2) + ' Magias</h1>' +
    '<p class="lede">Grimório de magias e encantamentos para GURPS 4ª Edição.</p>' +
    '</div>' +
    (can ? '<div class="btn-row">' +
      '<button class="btn" type="button" id="syncSpellsBtn" title="Atualizar grimório a partir de dados/magias.json">' + svg(ICON.spell, 16) + ' Sincronizar magias</button>' +
      '<button class="btn primary" type="button" id="newSpellBtn">' + svg(ICON.plus, 16, 2.4) + 'Nova magia</button>' +
    '</div>' : '') +
    '</div>';

  var toolbar = '<div class="toolbar" style="margin-bottom:16px">' +
    '<div class="field search" style="min-width:240px;flex:1"><input type="search" id="spellSearch" placeholder="Buscar por nome, efeito ou pré-requisito…" value="' + esc(ui.q) + '" autocomplete="off" aria-label="Buscar magias"></div>' +
    '<div class="field" style="margin:0"><select id="spellCollegeFilter" aria-label="Filtrar por escola">' +
    '<option value="">Todas as escolas (' + colleges.length + ')</option>' +
    colleges.map(function (c) { return '<option value="' + esc(c) + '"' + (ui.college === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellClassFilter" aria-label="Filtrar por classe">' +
    '<option value="">Todas as classes</option>' +
    classes.map(function (cl) { return '<option value="' + esc(cl) + '"' + (ui.spellClass === cl ? ' selected' : '') + '>' + esc(cl) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="field" style="margin:0"><select id="spellDiffFilter" aria-label="Filtrar por dificuldade">' +
    '<option value="">Dificuldade (Todas)</option>' +
    '<option value="H"' + (ui.difficulty === 'H' ? ' selected' : '') + '>Hard (H)</option>' +
    '<option value="VH"' + (ui.difficulty === 'VH' ? ' selected' : '') + '>Very Hard (VH)</option>' +
    '</select></div>' +
    '</div>';

  var body = notice() + '<div id="spellResults"></div>';

  pageRoot.innerHTML = head + toolbar + body;

  var qInput = $('spellSearch');
  if (qInput) {
    qInput.oninput = function () {
      ui.q = qInput.value;
      ui.limit = 60;
      renderSpellList();
    };
  }

  var cFilter = $('spellCollegeFilter');
  if (cFilter) {
    cFilter.onchange = function () {
      ui.college = cFilter.value;
      ui.limit = 60;
      renderSpellList();
    };
  }

  var clFilter = $('spellClassFilter');
  if (clFilter) {
    clFilter.onchange = function () {
      ui.spellClass = clFilter.value;
      ui.limit = 60;
      renderSpellList();
    };
  }

  var dFilter = $('spellDiffFilter');
  if (dFilter) {
    dFilter.onchange = function () {
      ui.difficulty = dFilter.value;
      ui.limit = 60;
      renderSpellList();
    };
  }

  var nb = $('newSpellBtn');
  if (nb) {
    nb.onclick = function () { openSpellForm(null); };
  }

  var sb = $('syncSpellsBtn');
  if (sb) {
    sb.onclick = function () {
      if (!confirm('Deseja sincronizar o grimório com a base do arquivo dados/magias.json? Todas as 647 magias serão atualizadas com as descrições mais recentes.')) return;
      sb.disabled = true;
      sb.textContent = 'Sincronizando…';
      seedSpellsFromLocal().then(function (count) {
        sb.disabled = false;
        sb.innerHTML = svg(ICON.spell, 16) + ' Sincronizar magias';
        toast((count || 647) + ' magias sincronizadas com sucesso!');
        renderSpellList();
      }, function (err) {
        sb.disabled = false;
        sb.innerHTML = svg(ICON.spell, 16) + ' Sincronizar magias';
        toast(errorText(err), true);
      });
    };
  }

  renderSpellList();
}

function filterSpellsList() {
  var ui = S.ui || {};
  var q = norm(ui.q || '').trim();
  var college = (ui.college || '').toLowerCase();
  var sClass = (ui.spellClass || '').toLowerCase();
  var diff = (ui.difficulty || '').toUpperCase();

  return (W.spells || []).filter(function (s) {
    if (diff && (s.difficulty || '').toUpperCase() !== diff) return false;
    if (college && (s.college || '').toLowerCase().indexOf(college) < 0) return false;
    if (sClass && (s.class || '').toLowerCase().indexOf(sClass) < 0) return false;
    if (!q) return true;

    var hay = norm((s.name || '') + ' ' + (s.college || '') + ' ' + (s.class || '') + ' ' + (s.description || '') + ' ' + (s.prerequisites || ''));
    return hay.indexOf(q) >= 0;
  }).sort(byName);
}

function renderSpellList() {
  var container = $('spellResults');
  if (!container) return;

  var all = filterSpellsList();
  var ui = S.ui || {};
  var limit = ui.limit || 60;
  var visible = all.slice(0, limit);

  if (!all.length) {
    if (!(W.spells || []).length && W.loaded.spells) {
      var seedHtml = isMestre()
        ? '<div style="margin-top:14px"><button class="btn primary" type="button" id="seedSpellsBtn">' + svg(ICON.spell, 16) + ' Importar 647 magias padrão do GURPS</button></div>'
        : '';
      container.innerHTML = '<div class="empty-box" style="padding:48px 24px;text-align:center;background:var(--surface);border-radius:14px;border:1px solid var(--line);margin-top:16px">' +
        svg(ICON.spell, 48, 1.2) +
        '<h3 style="margin:12px 0 4px">Nenhuma magia encontrada</h3>' +
        '<p class="lede" style="margin:0">A base de dados de magias ainda está vazia.</p>' +
        seedHtml +
        '</div>';

      var sBtn = $('seedSpellsBtn');
      if (sBtn) {
        sBtn.onclick = function () {
          sBtn.disabled = true;
          sBtn.textContent = 'Importando magias…';
          seedSpellsFromLocal().then(function (count) {
            toast((count || 647) + ' magias importadas com sucesso!');
          }, function (err) {
            sBtn.disabled = false;
            sBtn.textContent = 'Importar 647 magias padrão do GURPS';
            toast(errorText(err), true);
          });
        };
      }
      return;
    }

    container.innerHTML = '<p class="lede" style="padding:24px 0">Nenhuma magia corresponde aos filtros aplicados.</p>';
    return;
  }

  var countMeta = '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
    '<span>Mostrando <b>' + visible.length + '</b> de <b>' + all.length + '</b> magias</span>' +
    '</div>';

  var cards = '<div class="spell-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">' +
    visible.map(function (s) {
      var isVH = (s.difficulty || '').toUpperCase() === 'VH';
      var diffBadge = '<span class="spell-badge ' + (isVH ? 'diff-vh' : 'diff-h') + '">' + esc(s.difficulty || 'H') + '</span>';
      var collegeTag = s.college ? '<span class="spell-tag college">' + esc(s.college) + '</span>' : '';
      var classTag = s.class ? '<span class="spell-tag sclass">' + esc(s.class) + '</span>' : '';

      var quickStats = [];
      if (s.timeToCast) quickStats.push('Tempo: ' + esc(s.timeToCast));
      if (s.initialCost) quickStats.push('Custo: ' + esc(s.initialCost));

      return '<a class="spell-card" href="' + spellHref(s.id) + '" style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,transform .15s">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<strong style="font-size:15px;line-height:1.3;color:var(--text)">' + esc(s.name) + '</strong>' +
        diffBadge +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px">' + collegeTag + classTag + '</div>' +
        (quickStats.length ? '<div style="font-size:12px;color:var(--muted)">' + quickStats.join(' · ') + '</div>' : '') +
        (s.description ? '<div style="font-size:13px;line-height:1.4;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(s.description) + '</div>' : '') +
        (s.page ? '<div style="font-size:11px;color:var(--faint);margin-top:auto">Pág. ' + esc(s.page) + '</div>' : '') +
        '</a>';
    }).join('') +
    '</div>';

  var moreBtn = (visible.length < all.length)
    ? '<div style="text-align:center;margin-top:20px"><button class="btn" type="button" id="loadMoreSpellsBtn">Carregar mais (' + (all.length - visible.length) + ' restantes)</button></div>'
    : '';

  container.innerHTML = countMeta + cards + moreBtn;

  var lm = $('loadMoreSpellsBtn');
  if (lm) {
    lm.onclick = function () {
      ui.limit = (ui.limit || 60) + 60;
      renderSpellList();
    };
  }
}

function renderSpellPage() {
  var s = spellById(S.route.spellId), ui = S.ui;
  if (s && s.id && s.id !== S.route.spellId) {
    go(spellHref(s.id), true);
    return;
  }
  if (!s) {
    pageRoot.innerHTML = crumbsHtml('spells') +
      (W.loaded.spells
        ? '<h1>Magia não encontrada</h1><p class="lede">Essa magia pode ter sido excluída ou o link está incorreto.</p><div><a class="btn" href="#magias">Voltar para Magias</a></div>'
        : '<p class="lede">Carregando magia…</p>');
    return;
  }

  var can = isMestre();
  var isVH = (s.difficulty || '').toUpperCase() === 'VH';

  var head = crumbsHtml('spell:' + s.id) +
    '<div class="head-row"><div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
    '<span class="badge">' + svg(ICON.spell, 12, 2.4) + ' Magia</span>' +
    '<span class="spell-badge ' + (isVH ? 'diff-vh' : 'diff-h') + '">' + (isVH ? 'Very Hard (VH)' : 'Hard (H)') + '</span>' +
    '</div>' +
    '<h1>' + esc(s.name) + '</h1>' +
    '<p class="lede">' + (s.college ? esc(s.college) : 'Sem escola') + (s.class ? ' · ' + esc(s.class) : '') + '</p>' +
    '</div>' +
    (can ? '<div class="btn-row"><button class="btn" type="button" id="editSpellBtn">' + svg(ICON.edit, 15) + 'Editar magia</button><button class="btn danger" type="button" id="delSpellBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
    '</div>' +
    (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir a magia <b>' + esc(s.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delSpellYes">Excluir magia</button><button class="btn ghost" type="button" id="delSpellNo">Cancelar</button></div></div>' : '');

  var main = '<section><h2 class="sec-title">Efeito e Descrição</h2>' +
    (s.description ? '<p class="long">' + esc(s.description) + '</p>' : '<p class="long none">Sem descrição cadastrada.</p>') +
    '</section>' +
    (s.prerequisites ? '<section><h2 class="sec-title">Pré-requisitos</h2><div class="box" style="margin:0"><p style="margin:0;font-size:14px;line-height:1.6">' + esc(s.prerequisites) + '</p></div></section>' : '');

  var side = '<div class="box"><h2 class="sec-title" style="margin:0">Parâmetros</h2><dl class="facts">' +
    '<dt>Escola / Colégio</dt><dd>' + (s.college ? esc(s.college) : '<span class="none">Não informado</span>') + '</dd>' +
    '<dt>Classe</dt><dd>' + (s.class ? esc(s.class) : '<span class="none">Não informado</span>') + '</dd>' +
    '<dt>Dificuldade</dt><dd>IQ/' + esc(s.difficulty || 'H') + '</dd>' +
    '<dt>Tempo de Conjuração</dt><dd>' + (s.timeToCast ? esc(s.timeToCast) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Duração</dt><dd>' + (s.duration ? esc(s.duration) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Custo Inicial</dt><dd>' + (s.initialCost ? esc(s.initialCost) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Custo Manutenção</dt><dd>' + (s.maintenanceCost ? esc(s.maintenanceCost) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Página / Livro</dt><dd>' + (s.page ? esc(s.page) : '<span class="none">—</span>') + '</dd>' +
    '<dt>Fonte</dt><dd>' + (s.source ? esc(s.source) : '<span class="none">—</span>') + '</dd>' +
    '</dl></div>';

  pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';

  if (can) {
    var eb = $('editSpellBtn'); if (eb) eb.onclick = function () { openSpellForm(s); };
    var db = $('delSpellBtn'); if (db) db.onclick = function () { ui.confirmDelete = true; renderSpellPage(); };
    var dn = $('delSpellNo'); if (dn) dn.onclick = function () { ui.confirmDelete = false; renderSpellPage(); };
    var dy = $('delSpellYes'); if (dy) dy.onclick = function () {
      dy.disabled = true;
      Ops.deleteSpell(s).then(function () {
        toast('Magia excluída.');
        go('#magias', true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };
  }
}

function openSpellForm(s) {
  if (!isMestre()) {
    toast('Apenas o Mestre pode criar ou editar magias.', true);
    return;
  }

  var editing = !!s;
  var colleges = spellColleges();
  var classes = spellClasses();

  var html = '<form id="spellForm" novalidate><h2 id="sfTitle">' + (editing ? 'Editar magia' : 'Nova magia') + '</h2>' +
    '<div class="field" id="f_sname"><label for="sname">Nome da magia</label>' +
    '<input type="text" id="sname" maxlength="100" autocomplete="off" placeholder="Ex.: Fireball" value="' + esc(editing ? s.name : '') + '">' +
    '<div class="err" id="err_sname"></div></div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="scollege">Escola / Colégio</label>' +
    '<input type="text" id="scollege" list="collegeList" maxlength="100" placeholder="Ex.: Fire, Air" value="' + esc(editing ? s.college || '' : '') + '">' +
    '<datalist id="collegeList">' + colleges.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +

    '<div class="field"><label for="sclass">Classe</label>' +
    '<input type="text" id="sclass" list="classList" maxlength="80" placeholder="Ex.: Missile, Regular" value="' + esc(editing ? s.class || '' : '') + '">' +
    '<datalist id="classList">' + classes.map(function (cl) { return '<option value="' + esc(cl) + '">'; }).join('') + '</datalist></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="sdiff">Dificuldade</label>' +
    '<select id="sdiff">' +
    '<option value="H"' + (editing && s.difficulty === 'H' ? ' selected' : '') + '>Hard (H)</option>' +
    '<option value="VH"' + (editing && s.difficulty === 'VH' ? ' selected' : '') + '>Very Hard (VH)</option>' +
    '</select></div>' +

    '<div class="field"><label for="scast">Tempo de conjuração</label>' +
    '<input type="text" id="scast" maxlength="50" placeholder="Ex.: 1 sec., 1 hour" value="' + esc(editing ? s.timeToCast || '' : '') + '"></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="sdur">Duração</label>' +
    '<input type="text" id="sdur" maxlength="50" placeholder="Ex.: 1 min., Instantaneous" value="' + esc(editing ? s.duration || '' : '') + '"></div>' +

    '<div class="field"><label for="scost">Custo inicial</label>' +
    '<input type="text" id="scost" maxlength="50" placeholder="Ex.: 2 Base, 1 to 3" value="' + esc(editing ? s.initialCost || '' : '') + '"></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
    '<div class="field"><label for="smaint">Custo de manutenção</label>' +
    '<input type="text" id="smaint" maxlength="50" placeholder="Ex.: 1, Half, Same, –" value="' + esc(editing ? s.maintenanceCost || '' : '') + '"></div>' +

    '<div class="field"><label for="spage">Página / Livro</label>' +
    '<input type="text" id="spage" maxlength="50" placeholder="Ex.: B246, M45" value="' + esc(editing ? s.page || '' : '') + '"></div>' +
    '</div>' +

    '<div class="field"><label for="sprereq">Pré-requisitos</label>' +
    '<input type="text" id="sprereq" maxlength="250" placeholder="Ex.: Magery 1, Ignite Fire" value="' + esc(editing ? s.prerequisites || '' : '') + '"></div>' +

    '<div class="field"><label for="sdesc">Descrição / Efeito</label>' +
    '<textarea id="sdesc" rows="6" maxlength="20000" placeholder="Descreva o efeito mágico, dados de dano, testes resistidos…">' + esc(editing ? s.description || '' : '') + '</textarea></div>' +

    '<div class="field"><label for="ssource">Fonte / Livro de origem</label>' +
    '<input type="text" id="ssource" maxlength="100" placeholder="Ex.: Basic Set, GURPS Magic" value="' + esc(editing ? s.source || '' : '') + '"></div>' +

    flagHtml('svis', s, true) +

    '<div class="form-err" id="sfErr" role="alert"></div>' +
    '<div class="btn-row" style="justify-content:flex-end">' +
    '<button class="btn ghost" type="button" id="sfCancel">Cancelar</button>' +
    '<button class="btn primary" type="submit" id="sfSave">' + (editing ? 'Salvar magia' : 'Criar magia') + '</button>' +
    '</div></form>';

  showModal(html);
  modal.setAttribute('aria-labelledby', 'sfTitle');

  var name = $('sname');
  name.addEventListener('input', function () {
    if (name.value.trim()) {
      $('err_sname').textContent = '';
      $('f_sname').classList.remove('invalid');
    }
  });

  $('sfCancel').onclick = function () { closeModal(); };

  $('spellForm').onsubmit = function (e) {
    e.preventDefault();
    if (modalOpen.busy) return;

    var n = name.value.trim();
    if (!n) {
      $('err_sname').textContent = 'Informe o nome da magia.';
      $('f_sname').classList.add('invalid');
      name.focus();
      return;
    }

    modalOpen.busy = true;
    var btn = $('sfSave');
    btn.disabled = true;
    btn.textContent = 'Salvando…';
    $('sfCancel').disabled = true;
    $('sfErr').textContent = '';

    var fields = {
      name: n,
      college: $('scollege').value.trim(),
      class: $('sclass').value.trim(),
      difficulty: $('sdiff').value.trim(),
      timeToCast: $('scast').value.trim(),
      duration: $('sdur').value.trim(),
      initialCost: $('scost').value.trim(),
      maintenanceCost: $('smaint').value.trim(),
      prerequisites: $('sprereq').value.trim(),
      description: $('sdesc').value.trim(),
      page: $('spage').value.trim(),
      source: $('ssource').value.trim(),
      visible: flagVal('svis', s),
      sharedWith: shareVal('svis', s)
    };

    Ops.saveSpell(s, fields).then(function (id) {
      closeModal(true);
      toast(editing ? 'Magia salva.' : 'Magia criada.');
      if (!editing) go(spellHref(id));
    }, function (er) {
      if (!modalOpen) return;
      modalOpen.busy = false;
      btn.disabled = false;
      btn.textContent = editing ? 'Salvar magia' : 'Criar magia';
      $('sfCancel').disabled = false;
      $('sfErr').textContent = errorText(er);
    });
  };
}

function seedSpellsFromLocal(force) {
  if (!W.store) return Promise.reject({ message: 'Armazenamento indisponível.' });
  return fetch('dados/magias.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Não foi possível carregar dados/magias.json');
      return res.json();
    })
    .then(function (list) {
      if (!Array.isArray(list) || !list.length) throw new Error('Arquivo de magias vazio.');
      return Ops.importSpells(list, !!force).then(function () {
        return list.length;
      });
    });
}

