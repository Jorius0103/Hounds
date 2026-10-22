import sys

with open('mesa.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('var PassDayModalComponent =')
idx_end = text.find('function n1(){', idx_start)

if idx_start == -1 or idx_end == -1:
    print("Cannot find PassDayModalComponent boundaries in mesa.html")
    sys.exit(1)

old_comp = text[idx_start:idx_end]
print("Found old component, length:", len(old_comp))

new_comp = """var PassDayModalComponent = ({isOpen, onClose, players, onConfirm}) => {
  if (!isOpen) return null;
  let isMana = (it) => {
    if (!it) return !1;
    if (it.category === 'mana') return !0;
    let nm = (it.name || '').toLowerCase();
    return nm.includes('mana') || nm.includes('pedra de mana') || nm.includes('energia');
  };
  let charManaList = (players || [])
    .filter(p => p.characterType === 'player' || !p.characterType)
    .map(char => ({ char, items: (char.extraItems || []).filter(isMana) }))
    .filter(entry => entry.items.length > 0);

  let [passDays, setPassDays] = (0, ht.useState)(1);
  let [showFullItems, setShowFullItems] = (0, ht.useState)(!1);
  let [selMap, setSelMap] = (0, ht.useState)(() => {
    let init = {};
    charManaList.forEach(({char, items}) => {
      let needRec = items.filter(it => (it.current ?? 0) < (it.max ?? 0));
      init[char.id] = new Set(needRec.map(it => it.id));
    });
    return init;
  });

  let toggleItem = (charId, item) => {
    let isFull = (item.current ?? 0) >= (item.max ?? 0);
    if (isFull) return;
    setSelMap(prev => {
      let cur = new Set(prev[charId] || []);
      if (cur.has(item.id)) cur.delete(item.id); else cur.add(item.id);
      return {...prev, [charId]: cur};
    });
  };

  let toggleAll = (charId, items) => {
    let recItems = items.filter(it => (it.current ?? 0) < (it.max ?? 0));
    if (recItems.length === 0) return;
    setSelMap(prev => {
      let cur = prev[charId] || new Set();
      let all = recItems.every(it => cur.has(it.id));
      return {...prev, [charId]: all ? new Set() : new Set(recItems.map(it => it.id))};
    });
  };

  let selCount = Object.values(selMap).reduce((acc, s) => acc + s.size, 0);

  let handleConfirm = () => {
    let res = {};
    Object.entries(selMap).forEach(([cid, s]) => { res[cid] = Array.from(s); });
    onConfirm(res, Math.max(1, passDays || 1));
    onClose();
  };

  return (0, ct.jsx)("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xs overflow-y-auto",
    children: (0, ct.jsxs)("div", {
      className: "relative w-full max-w-xl bg-slate-900 border border-amber-500/35 rounded-2xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden m-auto",
      children: [
        /* Header limpo com respiro nos cantos */
        (0, ct.jsxs)("div", {
          className: "shrink-0 flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-b border-amber-500/20",
          children: [
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-2.5",
              children: [
                (0, ct.jsx)("div", {
                  className: "w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0",
                  children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("circle", { cx: "12", cy: "12", r: "4" }), (0, ct.jsx)("path", { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" })] })
                }),
                (0, ct.jsx)("h2", {
                  className: "text-base sm:text-lg font-bold text-white tracking-tight",
                  children: "Passar o Dia"
                })
              ]
            }),
            (0, ct.jsx)("button", {
              type: "button",
              onClick: onClose,
              className: "p-1.5 mr-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0",
              title: "Fechar",
              children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, ct.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] })
            })
          ]
        }),
        /* Subheader / Barra de Controles e Filtro */
        (0, ct.jsxs)("div", {
          className: "shrink-0 px-5 py-2.5 sm:px-6 sm:py-3 bg-slate-950/80 border-b border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3",
          children: [
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-1.5 flex-1 min-w-[180px]",
              children: [
                (0, ct.jsx)("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-amber-400 shrink-0", children: (0, ct.jsx)("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }) }),
                (0, ct.jsx)("span", { className: "text-[11px] leading-snug text-slate-300", children: "Itens selecionados recuperam mana." })
              ]
            }),
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-3",
              children: [
                /* Checkbox para mostrar itens cheios */
                (0, ct.jsxs)("label", {
                  className: "flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none transition-colors",
                  children: [
                    (0, ct.jsx)("input", {
                      type: "checkbox",
                      checked: showFullItems,
                      onChange: e => setShowFullItems(e.target.checked),
                      className: "w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                    }),
                    (0, ct.jsx)("span", { className: "text-[11px] font-medium text-slate-300", children: "Mostrar cheios" })
                  ]
                }),
                /* Input de Dias */
                (0, ct.jsxs)("div", {
                  className: "flex items-center gap-1.5 bg-slate-900 border border-slate-750 px-2.5 py-1 rounded-lg shadow-inner",
                  children: [
                    (0, ct.jsx)("span", { className: "text-[11px] font-bold text-amber-400 whitespace-nowrap", children: "Dias:" }),
                    (0, ct.jsx)("input", {
                      type: "number",
                      min: 1,
                      max: 365,
                      value: passDays,
                      onChange: e => {
                        let val = parseInt(e.target.value, 10);
                        setPassDays(isNaN(val) || val < 1 ? 1 : val);
                      },
                      className: "w-12 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-white focus:outline-none"
                    })
                  ]
                })
              ]
            })
          ]
        }),
        /* Content list com rolagem e min-h-0 */
        (0, ct.jsx)("div", {
          className: "flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3.5 custom-scrollbar",
          children: charManaList.length === 0 ? (
            (0, ct.jsxs)("div", {
              className: "py-12 text-center text-slate-400 space-y-2",
              children: [
                (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "mx-auto text-slate-500", children: [(0, ct.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, ct.jsx)("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), (0, ct.jsx)("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }),
                (0, ct.jsx)("p", { className: "text-sm font-semibold text-slate-200", children: "Nenhum Item de Mana encontrado nos Personagens" }),
                (0, ct.jsx)("p", { className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed", children: "Cadastre itens com a categoria \\"Mana\\" na seção de Itens Extras & Recursos dos Personagens para recarregá-los aqui." })
              ]
            })
          ) : (
            charManaList.map(({ char, items }) => {
              let charSet = selMap[char.id] || new Set();
              let fullItems = items.filter(it => (it.current ?? 0) >= (it.max ?? 0));
              let recItems = items.filter(it => (it.current ?? 0) < (it.max ?? 0));
              let visibleItems = showFullItems ? items : recItems;
              let allRecSel = recItems.length > 0 && recItems.every(it => charSet.has(it.id));

              return (0, ct.jsxs)("div", {
                key: char.id,
                className: "bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-sm",
                children: [
                  /* Header do Personagem com respiro */
                  (0, ct.jsxs)("div", {
                    className: "flex items-center justify-between border-b border-slate-800/80 pb-2 px-0.5",
                    children: [
                      (0, ct.jsxs)("div", {
                        className: "flex items-center gap-2 min-w-0 pr-2",
                        children: [
                          (0, ct.jsx)("div", {
                            className: "w-6 h-6 rounded-md bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0",
                            children: (char.name || 'P').charAt(0).toUpperCase()
                          }),
                          (0, ct.jsx)("span", {
                            className: "text-xs sm:text-sm font-bold text-white truncate",
                            children: char.name
                          }),
                          (0, ct.jsxs)("span", {
                            className: "text-[11px] text-slate-400 shrink-0",
                            children: [
                              "(",
                              recItems.length,
                              " para recarga",
                              fullItems.length > 0 ? ` · ${fullItems.length} cheio${fullItems.length > 1 ? 's' : ''}` : "",
                              ")"
                            ]
                          })
                        ]
                      }),
                      recItems.length > 0 ? (
                        (0, ct.jsx)("button", {
                          type: "button",
                          onClick: () => toggleAll(char.id, items),
                          className: "text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-0.5 rounded hover:bg-slate-900 transition-colors shrink-0 cursor-pointer",
                          children: allRecSel ? "Desmarcar todos" : "Marcar todos"
                        })
                      ) : null
                    ]
                  }),
                  /* Caso todos os itens estejam cheios e o checkbox esteja desmarcado */
                  visibleItems.length === 0 ? (
                    (0, ct.jsxs)("div", {
                      className: "flex items-center justify-between py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-800/60 text-xs text-slate-400",
                      children: [
                        (0, ct.jsxs)("span", {
                          className: "italic flex items-center gap-1.5",
                          children: [
                            (0, ct.jsx)("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", className: "text-emerald-400 shrink-0", children: (0, ct.jsx)("polyline", { points: "20 6 9 17 4 12" }) }),
                            "Itens já estão na capacidade máxima."
                          ]
                        }),
                        (0, ct.jsx)("span", {
                          className: "text-[10px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded font-sans",
                          children: "✓ 100% Cheio"
                        })
                      ]
                    })
                  ) : (
                    /* Grade de Itens compacta, com nome e numeros proximos */
                    (0, ct.jsx)("div", {
                      className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
                      children: visibleItems.map(item => {
                        let isFull = (item.current ?? 0) >= (item.max ?? 0);
                        let isSel = charSet.has(item.id);
                        let curVal = item.current ?? 0;
                        let maxVal = item.max ?? curVal;
                        let potentialGain = isFull ? 0 : Math.min(passDays, maxVal - curVal);
                        let nextVal = Math.min(curVal + passDays, maxVal);

                        return (0, ct.jsxs)("div", {
                          key: item.id,
                          onClick: () => !isFull && toggleItem(char.id, item),
                          className: `flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all select-none gap-2 ${
                            isFull
                              ? "bg-slate-950/40 border-slate-800/70 text-slate-400 opacity-65 cursor-default"
                              : isSel
                              ? "bg-amber-950/20 border-amber-500/60 text-amber-100 shadow-sm cursor-pointer hover:border-amber-400"
                              : "bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-70 hover:opacity-95 cursor-pointer"
                          }`,
                          children: [
                            /* Checkbox e Nome do Item */
                            (0, ct.jsxs)("div", {
                              className: "flex items-center gap-2 min-w-0 flex-1",
                              children: [
                                (0, ct.jsx)("input", {
                                  type: "checkbox",
                                  checked: isSel,
                                  disabled: isFull,
                                  onChange: () => {},
                                  className: "w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                }),
                                (0, ct.jsx)("span", {
                                  className: `font-semibold block truncate ${isFull ? "text-slate-400" : "text-slate-100"}`,
                                  title: item.name,
                                  children: item.name
                                })
                              ]
                            }),
                            /* Valores numericos ampliados e Badge bem proximos */
                            (0, ct.jsxs)("div", {
                              className: "flex items-center gap-1.5 shrink-0 font-mono",
                              children: [
                                (0, ct.jsx)("span", { className: "text-xs font-bold text-slate-400", children: curVal }),
                                (0, ct.jsx)("span", { className: "text-xs text-slate-600", children: "→" }),
                                (0, ct.jsxs)("span", {
                                  className: `text-sm font-black ${isFull ? "text-emerald-400" : "text-amber-300"}`,
                                  children: isFull ? `${curVal}/${maxVal}` : `${nextVal}/${maxVal}`
                                }),
                                isFull ? (
                                  (0, ct.jsx)("span", {
                                    className: "text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold font-sans",
                                    children: "Cheio"
                                  })
                                ) : (
                                  (0, ct.jsx)("span", {
                                    className: "text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-sans",
                                    children: `+${potentialGain}`
                                  })
                                )
                              ]
                            })
                          ]
                        });
                      })
                    })
                  )
                ]
              });
            })
          )
        }),
        /* Footer com respiro nas quinas e botoes */
        (0, ct.jsxs)("div", {
          className: "shrink-0 flex items-center justify-between gap-3 px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-950 border-t border-slate-800",
          children: [
            (0, ct.jsxs)("span", {
              className: "text-xs text-slate-300 font-medium truncate pl-1",
              children: [
                (0, ct.jsx)("strong", { className: "text-amber-400 font-bold", children: selCount }),
                ` ${selCount === 1 ? "item selecionado" : "itens selecionados"}`
              ]
            }),
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-2.5 shrink-0 pr-1",
              children: [
                (0, ct.jsx)("button", {
                  type: "button",
                  onClick: onClose,
                  className: "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0",
                  children: "Cancelar"
                }),
                (0, ct.jsxs)("button", {
                  type: "button",
                  onClick: handleConfirm,
                  disabled: selCount === 0 || charManaList.length === 0,
                  className: "flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap shrink-0",
                  children: [
                    (0, ct.jsx)("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: (0, ct.jsx)("polyline", { points: "20 6 9 17 4 12" }) }),
                    (0, ct.jsx)("span", { children: `Confirmar (+${passDays} Mana${passDays > 1 ? ` · ${passDays} Dias` : ""})` })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  });
};
"""

new_text = text[:idx_start] + new_comp + text[idx_end:]

with open('mesa.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_text)

print("mesa.html updated successfully with compact PassDayModalComponent!")
