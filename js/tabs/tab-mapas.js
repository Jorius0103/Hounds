/* =====================================================================
   Hounds — Aba: Mapas (Mundo › Maps)
   ===================================================================== */

(function () {
  function mapHref(id) {
    return '#map~' + encodeURIComponent(id);
  }
  window.mapHref = mapHref;

  function renderMapsPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var can = isMestre();
    var roots = childMaps(null);

    var body = '';
    if (!W.loaded.maps) {
      body = '<p class="lede">Carregando mapas…</p>';
    } else if (!W.maps.length) {
      body = '<div class="empty-state">' + svg(ICON.map, 34, 1.6) +
        '<strong>Nenhum mapa cadastrado</strong><span>' + (can ? 'Envie uma imagem com <b>Novo mapa</b> para começar.' : 'Os mapas criados vão aparecer aqui.') + '</span></div>';
    } else if (!roots.length) {
      body = '<p class="lede">Nenhum mapa de nível superior visível.</p>' +
        (can ? '<div class="tree-box"><h2 class="sec-title" style="margin:0 0 8px">Todos os mapas</h2><div class="mtree">' + fullTree(null) + '</div></div>' : '');
    } else {
      body = '<div class="map-grid">' + roots.map(function (m) {
        var k = childMaps(m.id).length, L = mapLocations(m.id).length;
        var meta = [k ? plural(k, 'submapa', 'submapas') : '', L ? plural(L, 'local', 'locais') : ''].filter(Boolean).join(' · ');
        return '<a class="map-card" href="' + mapHref(m.id) + '">' +
          '<div class="map-card-thumb">' + thumbSlot(m.image && m.image.ref, ICON.map) + '</div>' +
          '<div class="map-card-body"><strong>' + esc(m.name) + (isSecret(m) ? ' ' + secretTag() : '') + '</strong>' +
          (meta ? '<span class="meta">' + meta + '</span>' : '') +
          '</div></a>';
      }).join('') + '</div>' +
      (W.maps.length > roots.length ? '<div class="tree-box"><h2 class="sec-title" style="margin:0 0 8px">Hierarquia de mapas</h2><div class="mtree">' + fullTree(null) + '</div></div>' : '');
    }

    pageRoot.innerHTML =
      '<div class="head-row"><div>' + crumbsHtml('maps') + '<h1>Mapas</h1>' +
      '<p class="lede">A cartografia da campanha, do continente até o mapa local detalhado. Cada mapa pode ter um mapa pai e vários submapas.</p></div>' +
      (can ? '<button class="btn primary" type="button" id="newMapBtn">' + svg(ICON.plus, 16, 2.4) + 'Novo mapa</button>' : '') +
      '</div>' + notice() + body;

    fillImages(pageRoot);
    var b = $('newMapBtn');
    if (b) b.onclick = function () { openMapForm(null); };
  }

  function renderMapPage() {
    var pageRoot = $('pageRoot');
    if (!pageRoot) return;

    var r = window.S ? window.S.route : null;
    var m = r ? mapById(r.mapId) : null;
    var ui = (window.S && window.S.ui) || {};

    if (!m) {
      pageRoot.innerHTML = crumbsHtml('maps') + (W.loaded.maps ? '<h1>Mapa não encontrado</h1><p class="lede">Esse mapa foi excluído ou o link está incompleto.</p><div><a class="btn" href="#maps">Voltar para Maps</a></div>' : '<p class="lede">Carregando mapa…</p>');
      return;
    }

    var can = isMestre();
    var mk = (window.S && window.S.markersFor === m.id) ? window.S.markers : [];
    var locs = mapLocations(m.id), kids = childMaps(m.id), parent = mapById(W.parent[m.id]);
    var meta = [m.image ? m.image.w + ' × ' + m.image.h + ' px' : '', plural(mk.length, 'marcador', 'marcadores'), plural(locs.length, 'local', 'locais'), plural(kids.length, 'submapa', 'submapas')].filter(Boolean).join(' · ');

    var head = crumbsHtml('map:' + m.id) +
      '<div class="head-row"><div><h1>' + esc(m.name) + (isSecret(m) ? ' ' + secretTag() : '') + '</h1><div class="meta">' + meta + '</div>' +
      '<p class="lede" style="margin-top:6px">' + (parent ? 'Faz parte de <a class="inline" href="' + mapHref(parent.id) + '">' + esc(parent.name) + '</a>.' : 'Mapa de nível superior.') + '</p></div>' +
      '<a class="btn primary" href="#map~' + encodeURIComponent(m.id) + '~explorar">' + svg(ICON.explore, 16) + 'Explorar mapa</a></div>';

    var hier = '<div class="box"><h2 class="sec-title" style="margin:0">Hierarquia</h2>' + pathTree(mapChain(m.id), { markLast: true, kids: true }) + '</div>';

    var locBox = '<div class="box"><h2 class="sec-title" style="margin:0">Locais neste mapa</h2>' +
      (locs.length ? '<ul class="links">' + locs.map(function (l) {
        return '<li><a class="row-link" href="#loc~' + encodeURIComponent(l.id) + '">' + thumbSlot(l.image && l.image.ref, ICON.pin) + '<b>' + esc(l.name) + '</b></a></li>';
      }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum local ligado a este mapa.</p>') +
      (can ? '<div><button class="btn" type="button" id="newLocHere">' + svg(ICON.plus, 15, 2.4) + 'Novo local neste mapa</button></div>' : '') + '</div>';

    var mchars = mapCharacters(m.id);
    var charBox = '<div class="box"><h2 class="sec-title" style="margin:0">Personagens neste mapa</h2>' +
      (mchars.length ? '<div class="people">' + mchars.map(personChip).join('') + '</div>' : '<p class="lede" style="font-size:13px">Nenhum personagem ligado a este mapa.' + (can ? ' Ligue pelo campo <b>Mapas relacionados</b> do personagem.' : '') + '</p>') + '</div>';

    var mkBox = '<div class="box"><h2 class="sec-title" style="margin:0">Marcadores</h2>' +
      (mk.length ? '<ul class="mk-list">' + mk.map(function (x) {
        var c = cat(x.category), l = x.locationId && locById(x.locationId);
        return '<li><a class="mk-item" href="#map~' + encodeURIComponent(m.id) + '~explorar" data-focus="' + esc(x.id) + '">' +
          '<span class="dot" style="background:' + c.color + '">' + svg(c.icon, 14) + '</span>' +
          '<span class="t"><b>' + esc(x.title) + (isSecret(x) ? ' ' + secretTag() : '') + '</b><span>' + esc(l ? 'Local: ' + l.name : c.label) + '</span></span></a></li>';
      }).join('') + '</ul>' : '<p class="lede" style="font-size:13px">Nenhum marcador ainda.' + (can ? ' Em <b>Explorar mapa</b>, use <b>Adicionar marcador</b> e clique no ponto do mapa.' : '') + '</p>') + '</div>';

    var opts = '';
    if (can) {
      opts = '<div class="box"><h2 class="sec-title" style="margin:0">Opções do mapa</h2><div class="btn-row">' +
        '<button class="btn" type="button" id="editMapBtn">' + svg(ICON.edit, 15) + 'Editar mapa</button>' +
        '<button class="btn danger" type="button" id="deleteMapBtn">' + svg(ICON.trash, 15) + 'Excluir mapa</button></div>' +
        (ui.confirmDelete ? '<div class="confirm" role="alert"><span>Excluir <b>' + esc(m.name) + '</b>? Não dá para desfazer.</span><div class="btn-row"><button class="btn danger solid" type="button" id="deleteMapYes">Excluir mapa</button><button class="btn ghost" type="button" id="deleteMapNo">Cancelar</button></div></div>' : '') + '</div>';
    }

    pageRoot.innerHTML = head + '<div class="map-layout"><div class="preview" id="mapPreview">' + svg(ICON.map, 32, 1.6) + '</div><div class="side">' + hier + locBox + charBox + mkBox + opts + '</div></div>';

    W.store.imageUrl(m.image && m.image.ref).then(function (u) {
      var p = $('mapPreview');
      if (p && u) p.innerHTML = '<img src="' + esc(u) + '" alt="Mapa ' + esc(m.name) + '">';
    });
    fillImages(pageRoot);

    var e1 = $('editMapBtn');
    if (e1) e1.onclick = function () { openMapForm(m); };

    var nl = $('newLocHere');
    if (nl) nl.onclick = function () {
      if (window.openLocationForm) window.openLocationForm(null, m.id);
    };

    var db = $('deleteMapBtn');
    if (db) db.onclick = function () { ui.confirmDelete = true; renderMapPage(); };

    var dn = $('deleteMapNo');
    if (dn) dn.onclick = function () { ui.confirmDelete = false; renderMapPage(); };

    var dy = $('deleteMapYes');
    if (dy) dy.onclick = function () {
      dy.disabled = true;
      var target = W.parent[m.id] ? mapHref(W.parent[m.id]) : '#maps';
      Ops.deleteMap(m).then(function () {
        toast('Mapa excluído.');
        if (window.go) window.go(target, true);
      }, function (er) {
        dy.disabled = false;
        toast(errorText(er), true);
      });
    };

    pageRoot.querySelectorAll('[data-focus]').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.Explorer) Explorer.pending = { markerId: a.getAttribute('data-focus') };
      });
    });
  }

  function openMapForm(m) {
    var editing = !!m;
    var validMapParents = (W.maps || []).filter(function (x) {
      return !editing || x.id !== m.id;
    });

    var pOpts = '<option value="">Nenhum (nível superior)</option>' + validMapParents.map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (m && m.parentId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');

    var html = '<form id="mapForm" novalidate><h2 id="mfTitle">' + (editing ? 'Editar mapa' : 'Novo mapa') + '</h2>' +
      '<div class="field" id="f_mname"><label for="mname">Nome do mapa</label><input type="text" id="mname" maxlength="100" autocomplete="off" placeholder="Ex.: Tagmar, Região Central" value="' + esc(editing ? m.name : '') + '"><div class="err" id="err_mname"></div></div>' +
      (!editing ? imageFieldHtml('mimg', 'Imagem do mapa', 'Envie a imagem em JPG, PNG ou WebP, até 20 MB.') : '') +
      '<div class="field"><label for="mparent">Mapa pai</label><select id="mparent">' + pOpts + '</select></div>' +
      flagHtml('mvis', m) +
      '<div class="form-err" id="mfErr" role="alert"></div>' +
      '<div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" id="mfCancel">Cancelar</button><button class="btn primary" type="submit" id="mfSave">' + (editing ? 'Salvar alterações' : 'Criar mapa') + '</button></div></form>';

    showModal(html);

    var f = $('mapForm'), n = $('mname'), cancel = $('mfCancel');
    if (cancel) cancel.onclick = closeModal;

    var file = null, dims = { w: 1000, h: 1000 };
    if (!editing) {
      var fileInput = $('mimg_file'), btnPick = $('mimg_btn');
      if (btnPick && fileInput) {
        btnPick.onclick = function () { fileInput.click(); };
        fileInput.onchange = function () {
          if (fileInput.files && fileInput.files[0]) {
            file = fileInput.files[0];
            btnPick.querySelector('span').textContent = file.name;
            var im = new Image();
            im.onload = function () { dims = { w: im.width, h: im.height }; };
            im.src = URL.createObjectURL(file);
          }
        };
      }
    }

    f.onsubmit = function (e) {
      e.preventDefault();
      var name = n.value.trim();
      if (!name) {
        $('err_mname').textContent = 'Dê um nome ao mapa.';
        $('f_mname').classList.add('invalid');
        n.focus();
        return;
      }
      if (!editing && !file) {
        $('err_mimg').textContent = 'Selecione uma imagem para o mapa.';
        return;
      }

      var parentId = $('mparent').value || null;
      var visible = flagVal('mvis', m);
      var btn = $('mfSave');
      btn.disabled = true;
      btn.textContent = 'Salvando…';

      var p = editing
        ? Ops.updateMap(m.id, name, parentId, visible)
        : Ops.createMap(name, parentId, file, dims, visible);

      p.then(function (id) {
        closeModal();
        toast(editing ? 'Mapa atualizado.' : 'Mapa criado.');
        if (window.go) window.go(mapHref(editing ? m.id : id));
      }, function (err) {
        btn.disabled = false;
        btn.textContent = editing ? 'Salvar alterações' : 'Criar mapa';
        $('mfErr').textContent = errorText(err);
      });
    };
  }

  window.renderMapsPage = renderMapsPage;
  window.renderMapPage = renderMapPage;
  window.openMapForm = openMapForm;
})();
