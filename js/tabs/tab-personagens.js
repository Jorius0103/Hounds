/* =====================================================================
   Hounds — Aba: Personagens (Mundo › Personagens da Campanha)
   ===================================================================== */

(function () {
  function charHref(id) {
    return '#char~' + encodeURIComponent(id);
  }
  window.charHref = charHref;

  function renderCharsPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var can = isMestre();
    var qVal = (window.S && window.S.ui && window.S.ui.charQ) || '';

    pageRoot.innerHTML =
      '<div class="head-row"><div>' + crumbsHtml('chars') + '<h1>Personagens</h1>' +
      '<p class="lede">Os protagonistas, aliados, antagonistas e figuras de destaque da campanha.</p></div>' +
      (can ? '<button class="btn primary" type="button" id="newCharBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo personagem</button>' : '') +
      '</div>' + notice() +
      (W.characters.length ? '<div class="toolbar"><input class="search" id="charSearch" type="search" placeholder="Buscar por nome, raça, organização ou mapa…" autocomplete="off" value="' + esc(qVal) + '"><span class="meta" id="charCount"></span></div>' : '') +
      '<div id="charList"></div>';

    var b = $('newCharBtn');
    if (b) b.onclick = function () { openCharForm(null); };

    var s = $('charSearch');
    if (s) {
      s.addEventListener('input', function () {
        if (!window.S) window.S = { ui: {} };
        window.S.ui.charQ = s.value;
        renderCharList();
      });
    }

    renderCharList();
  }

  function renderCharList() {
    var el = $('charList');
    if (!el) return;

    if (!W.loaded.characters) {
      el.innerHTML = '<p class="lede">Carregando personagens…</p>';
      return;
    }
    if (!W.characters.length) {
      el.innerHTML = '<div class="empty-state">' + svg(ICON.user, 34, 1.6) +
        '<strong>Nenhum personagem cadastrado</strong><span>' + (isMestre() ? 'Crie o primeiro com <b>Novo personagem</b>.' : 'Os personagens criados vão aparecer aqui.') + '</span></div>';
      return;
    }

    var q = norm((window.S && window.S.ui && window.S.ui.charQ) || '');
    var list = W.characters.filter(function (c) {
      if (!isMestre() && isSecret(c)) return false;
      if (!q) return true;
      var nm = norm(c.name), rc = norm(c.race || ''), org = norm(c.organization || ''), desc = norm(c.description || '');
      return nm.indexOf(q) >= 0 || rc.indexOf(q) >= 0 || org.indexOf(q) >= 0 || desc.indexOf(q) >= 0;
    }).sort(byName);

    var cnt = $('charCount');
    if (cnt) cnt.textContent = String(list.length);

    if (!list.length) {
      el.innerHTML = '<p class="lede">Nenhum personagem encontrado para essa busca.</p>';
      return;
    }

    el.innerHTML = '<div class="map-grid">' + list.map(function (c) {
      var sub = charSubtitle(c);
      var m = (c.mapIds || []).length, l = charLocations(c.id).length;
      var meta = [m ? plural(m, 'mapa', 'mapas') : '', l ? plural(l, 'local', 'locais') : ''].filter(Boolean).join(' · ');
      return '<a class="map-card" href="' + charHref(c.id) + '">' +
        '<div class="map-card-thumb">' + thumbSlot(c.image && c.image.ref, ICON.user) + '</div>' +
        '<div class="map-card-body"><strong>' + esc(c.name) + (isSecret(c) ? ' ' + secretTag() : '') + '</strong>' +
        '<span class="where">' + (sub ? esc(sub) : 'Sem raça ou organização') + '</span>' +
        (meta ? '<span class="meta">' + meta + '</span>' : '') +
        '</div></a>';
    }).join('') + '</div>';

    fillImages(el);
  }

  function renderCharPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var r = window.S ? window.S.route : null;
    var c = r ? charById(r.charId) : null;
    var ui = (window.S && window.S.ui) || {};

    if (!c) {
      pageRoot.innerHTML = crumbsHtml('chars') + (W.loaded.characters ? '<h1>Personagem não encontrado</h1><p class="lede">Esse personagem foi excluído ou o link está incompleto.</p><div><a class="btn" href="#personagens">Voltar para Personagens</a></div>' : '<p class="lede">Carregando personagem…</p>');
      return;
    }

    var can = isMestre();
    var locs = charLocations(c.id);
    var maps = charMaps(c);

    var head = crumbsHtml('char:' + c.id) +
      '<div class="head-row"><div><span class="badge">' + svg(ICON.user, 12, 2.4) + 'Personagem</span><h1>' + esc(c.name) + (isSecret(c) ? ' ' + secretTag() : '') + '</h1>' +
      (charSubtitle(c) ? '<p class="lede">' + esc(charSubtitle(c)) + '</p>' : '') +
      '</div>' +
      (can ? '<div class="btn-row"><button class="btn" type="button" id="editCharBtn">' + svg(ICON.edit, 15) + 'Editar personagem</button><button class="btn danger" type="button" id="delCharBtn">' + svg(ICON.trash, 15) + 'Excluir</button></div>' : '') +
      '</div>' +
      (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(c.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="delCharYes">Excluir personagem</button><button class="btn ghost" type="button" id="delCharNo">Cancelar</button></div></div>' : '');

    var main = (c.image ? '<div class="loc-hero" id="charHero">' + svg(ICON.user, 32, 1.6) + '</div>' : '') +
      '<section><h2 class="sec-title">Descrição</h2>' +
      (c.description ? '<p class="long">' + esc(c.description) + '</p>' : '<p class="long none">Sem descrição.</p>') +
      '</section>';

    var side = '<div class="box"><h2 class="sec-title" style="margin:0">Ficha Básica</h2>' +
      '<dl class="facts"><dt>Raça</dt><dd>' + (c.race ? esc(c.race) : '<span class="none">Não informada</span>') + '</dd>' +
      '<dt>Organização</dt><dd>' + (c.organization ? esc(c.organization) : '<span class="none">Não informada</span>') + '</dd></dl></div>' +
      '<div class="box"><h2 class="sec-title" style="margin:0">Mapas Relacionados</h2>' +
      (maps.length ? '<ul class="links">' + maps.map(function (m) {
        return '<li><a class="row-link" href="' + mapHref(m.id) + '">' + thumbSlot(m.image && m.image.ref, ICON.map) + '<span class="mtext"><b>' + esc(m.name) + '</b></span></a></li>';
      }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum mapa relacionado.</p>') +
      '</div>' +
      '<div class="box"><h2 class="sec-title" style="margin:0">Locais Relacionados</h2>' +
      (locs.length ? '<ul class="links">' + locs.map(function (l) {
        return '<li><a class="row-link" href="#loc~' + encodeURIComponent(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<span class="mtext"><b>' + esc(l.name) + '</b></span></a></li>';
      }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local relacionado.</p>') +
      '</div>';

    pageRoot.innerHTML = head + '<div class="loc-layout"><div class="side" style="gap:22px">' + main + '</div><div class="side">' + side + '</div></div>';

    if (c.image) {
      W.store.imageUrl(c.image.ref).then(function (u) {
        var h = $('charHero');
        if (h && u) h.innerHTML = '<img src="' + esc(u) + '" alt="' + esc(c.name) + '">';
      });
    }
    fillImages(pageRoot);

    var e1 = $('editCharBtn');
    if (e1) e1.onclick = function () { openCharForm(c); };

    var d1 = $('delCharBtn');
    if (d1) d1.onclick = function () { ui.confirmDelete = true; renderCharPage(); };

    var dn = $('delCharNo');
    if (dn) dn.onclick = function () { ui.confirmDelete = false; renderCharPage(); };

    var dy = $('delCharYes');
    if (dy) dy.onclick = function () {
      dy.disabled = true;
      Ops.deleteCharacter(c).then(function () {
        toast('Personagem excluído.');
        if (window.go) window.go('#personagens', true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };
  }

  function openCharForm(c) {
    var editing = !!c;
    var races = distinct('race');
    RACE_DEFAULTS.forEach(function (r) {
      if (!races.some(function (x) { return norm(x) === norm(r); })) races.push(r);
    });
    var orgs = distinct('organization');

    var html = '<form id="charForm" novalidate><h2 id="cfTitle">' + (editing ? 'Editar personagem' : 'Novo personagem') + '</h2>' +
      '<div class="field" id="f_cname"><label for="cname">Nome</label><input type="text" id="cname" maxlength="100" autocomplete="off" placeholder="Ex.: Duenne, Azur" value="' + esc(editing ? c.name : '') + '"><div class="err" id="err_cname"></div></div>' +
      imageFieldHtml('cimg', 'Imagem', 'Retrato ou ilustração (opcional, até 20 MB).') +
      '<div class="field"><label for="cdesc">Descrição</label><textarea id="cdesc" rows="5" maxlength="20000" placeholder="Aparência, histórico, notas e relacionamentos…">' + esc(editing ? c.description || '' : '') + '</textarea></div>' +
      '<div class="two"><div class="field"><label for="crace">Raça</label><input type="text" id="crace" list="raceList" maxlength="60" autocomplete="off" placeholder="Ex.: Humano" value="' + esc(editing ? c.race || '' : '') + '"><datalist id="raceList">' + races.map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label for="corg">Organização</label><input type="text" id="corg" list="orgList" maxlength="80" autocomplete="off" placeholder="Ex.: The Hounds" value="' + esc(editing ? c.organization || '' : '') + '"><datalist id="orgList">' + orgs.map(function (r) { return '<option value="' + esc(r) + '">'; }).join('') + '</datalist></div></div>' +
      flagHtml('cvis', c) +
      '<div class="form-err" id="cfErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="cfCancel">Cancelar</button><button class="btn primary" type="submit" id="cfSave">' + (editing ? 'Salvar personagem' : 'Criar personagem') + '</button></div></form>';

    showModal(html);

    var f = $('charForm'), n = $('cname'), cancel = $('cfCancel');
    if (cancel) cancel.onclick = closeModal;

    var file = null;
    var fileInput = $('cimg_file'), btnPick = $('cimg_btn');
    if (btnPick && fileInput) {
      btnPick.onclick = function () { fileInput.click(); };
      fileInput.onchange = function () {
        if (fileInput.files && fileInput.files[0]) {
          file = fileInput.files[0];
          btnPick.querySelector('span').textContent = file.name;
        }
      };
    }

    f.onsubmit = function (e) {
      e.preventDefault();
      var name = n.value.trim();
      if (!name) {
        $('err_cname').textContent = 'Dê um nome ao personagem.';
        $('f_cname').classList.add('invalid');
        n.focus();
        return;
      }

      var desc = $('cdesc').value.trim();
      var race = $('crace').value.trim();
      var org = $('corg').value.trim();
      var visible = flagVal('cvis', c);
      var btn = $('cfSave');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      var p = editing
        ? Ops.updateCharacter(c, name, desc, race, org, c.mapIds || [], [], file, false, visible)
        : Ops.createCharacter(name, desc, race, org, [], [], file, visible);

      p.then(function (id) {
        closeModal();
        toast(editing ? 'Personagem atualizado.' : 'Personagem criado.');
        if (window.go) window.go(charHref(editing ? c.id : id));
      }, function (err) {
        btn.disabled = false;
        btn.textContent = editing ? 'Salvar personagem' : 'Criar personagem';
        $('cfErr').textContent = errorText(err);
      });
    };
  }

  window.renderCharsPage = renderCharsPage;
  window.renderCharList = renderCharList;
  window.renderCharPage = renderCharPage;
  window.openCharForm = openCharForm;
})();
