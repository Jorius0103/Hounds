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
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "rgba(2, 6, 23, 0.85)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)"
    },
    children: (0, ct.jsxs)("div", {
      style: {
        position: "relative",
        margin: "auto",
        width: "100%",
        maxWidth: "620px",
        maxHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderRadius: "18px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        overflow: "hidden"
      },
      children: [
        /* Header com respiro nas quinas */
        (0, ct.jsxs)("div", {
          style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
            background: "linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)"
          },
          children: [
            (0, ct.jsxs)("div", {
              style: { display: "flex", alignItems: "center", gap: "10px" },
              children: [
                (0, ct.jsx)("div", {
                  style: {
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                    flexShrink: 0
                  },
                  children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("circle", { cx: "12", cy: "12", r: "4" }), (0, ct.jsx)("path", { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" })] })
                }),
                (0, ct.jsx)("h2", {
                  style: { fontSize: "16px", fontWeight: "bold", color: "#ffffff", margin: 0 },
                  children: "Passar o Dia"
                })
              ]
            }),
            (0, ct.jsx)("button", {
              type: "button",
              onClick: onClose,
              style: {
                padding: "6px",
                borderRadius: "8px",
                cursor: "pointer",
                flexShrink: 0,
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              title: "Fechar",
              children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, ct.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] })
            })
          ]
        }),
        /* Subheader / Barra de Controles e Filtro */
        (0, ct.jsxs)("div", {
          style: {
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            background: "rgba(2, 6, 23, 0.8)",
            borderBottom: "1px solid rgba(51, 65, 85, 0.8)",
            gap: "12px",
            fontSize: "12px"
          },
          children: [
            (0, ct.jsxs)("div", {
              style: { display: "flex", alignItems: "center", gap: "8px", flex: "1 1 180px", minWidth: "180px" },
              children: [
                (0, ct.jsx)("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { color: "#fbbf24", flexShrink: 0 }, children: (0, ct.jsx)("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }) }),
                (0, ct.jsx)("span", { style: { fontSize: "11px", color: "#cbd5e1", lineHeight: "1.4" }, children: "Itens selecionados recuperam mana." })
              ]
            }),
            (0, ct.jsxs)("div", {
              style: { display: "flex", alignItems: "center", gap: "14px" },
              children: [
                /* Checkbox para mostrar itens ja cheios */
                (0, ct.jsxs)("label", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                    userSelect: "none"
                  },
                  children: [
                    (0, ct.jsx)("input", {
                      type: "checkbox",
                      checked: showFullItems,
                      onChange: e => setShowFullItems(e.target.checked),
                      className: "accent-amber-500 cursor-pointer",
                      style: { width: "14px", height: "14px", cursor: "pointer" }
                    }),
                    (0, ct.jsx)("span", { children: "Mostrar cheios" })
                  ]
                }),
                /* Input de Dias */
                (0, ct.jsxs)("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#0f172a",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    padding: "4px 8px",
                    borderRadius: "8px"
                  },
                  children: [
                    (0, ct.jsx)("label", { htmlFor: "passDayInput", style: { fontSize: "11px", fontWeight: "bold", color: "#fbbf24", whiteSpace: "nowrap" }, children: "Dias:" }),
                    (0, ct.jsx)("input", {
                      id: "passDayInput",
                      type: "number",
                      min: 1,
                      max: 365,
                      value: passDays,
                      onChange: e => {
                        let val = parseInt(e.target.value, 10);
                        setPassDays(isNaN(val) || val < 1 ? 1 : val);
                      },
                      style: {
                        width: "44px",
                        background: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        padding: "2px 4px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        color: "#ffffff",
                        outline: "none"
                      }
                    })
                  ]
                })
              ]
            })
          ]
        }),
        /* Content list com rolagem e minHeight: 0 garantido */
        (0, ct.jsx)("div", {
          className: "custom-scrollbar",
          style: {
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          },
          children: charManaList.length === 0 ? (
            (0, ct.jsxs)("div", {
              style: { padding: "36px 0", textAlign: "center", color: "#94a3b8" },
              children: [
                (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "28", height: "28", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { margin: "0 auto 8px", color: "#64748b" }, children: [(0, ct.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, ct.jsx)("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), (0, ct.jsx)("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }),
                (0, ct.jsx)("p", { style: { fontSize: "13px", fontWeight: 600, color: "#e2e8f0", margin: "0 0 4px" }, children: "Nenhum Item de Mana encontrado nos Personagens" }),
                (0, ct.jsx)("p", { style: { fontSize: "11px", color: "#64748b", maxWidth: "360px", margin: "0 auto", lineHeight: "1.4" }, children: 'Cadastre itens com a categoria "Mana" na seção de Itens Extras & Recursos dos Personagens para recarregá-los aqui.' })
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
                style: {
                  background: "rgba(2, 6, 23, 0.7)",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                },
                children: [
                  /* Header do Personagem com respiro */
                  (0, ct.jsxs)("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "8px",
                      borderBottom: "1px solid rgba(51, 65, 85, 0.6)"
                    },
                    children: [
                      (0, ct.jsxs)("div", {
                        style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
                        children: [
                          (0, ct.jsx)("div", {
                            style: {
                              width: "24px",
                              height: "24px",
                              borderRadius: "6px",
                              background: "rgba(6, 78, 59, 0.9)",
                              border: "1px solid rgba(5, 150, 105, 0.6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#6ee7b7",
                              fontSize: "11px",
                              fontWeight: "bold",
                              flexShrink: 0
                            },
                            children: (char.name || 'P').charAt(0).toUpperCase()
                          }),
                          (0, ct.jsx)("span", {
                            style: { fontSize: "13px", fontWeight: "bold", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
                            children: char.name
                          }),
                          (0, ct.jsxs)("span", {
                            style: { fontSize: "11px", color: "#94a3b8", flexShrink: 0 },
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
                          style: {
                            fontSize: "11px",
                            color: "#22d3ee",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            flexShrink: 0
                          },
                          children: allRecSel ? "Desmarcar todos" : "Marcar todos"
                        })
                      ) : null
                    ]
                  }),
                  /* Caso todos os itens estejam cheios e o checkbox esteja desmarcado */
                  visibleItems.length === 0 ? (
                    (0, ct.jsxs)("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(15, 23, 42, 0.4)",
                        borderRadius: "8px",
                        border: "1px solid rgba(51, 65, 85, 0.6)",
                        fontSize: "11px",
                        color: "#94a3b8"
                      },
                      children: [
                        (0, ct.jsxs)("span", {
                          style: { fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px" },
                          children: [
                            (0, ct.jsx)("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", style: { color: "#34d399", flexShrink: 0 }, children: (0, ct.jsx)("polyline", { points: "20 6 9 17 4 12" }) }),
                            "Itens já estão na capacidade máxima."
                          ]
                        }),
                        (0, ct.jsx)("span", {
                          style: {
                            fontSize: "10px",
                            color: "#34d399",
                            fontWeight: "bold",
                            background: "rgba(6, 78, 59, 0.7)",
                            border: "1px solid rgba(6, 95, 70, 0.6)",
                            padding: "2px 6px",
                            borderRadius: "6px"
                          },
                          children: "✓ 100% Cheio"
                        })
                      ]
                    })
                  ) : (
                    /* Grade de Itens compacta, com nome e numeros proximos */
                    (0, ct.jsx)("div", {
                      style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: "8px"
                      },
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
                          style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            gap: "8px",
                            userSelect: "none",
                            cursor: isFull ? "default" : "pointer",
                            background: isFull
                              ? "rgba(2, 6, 23, 0.4)"
                              : isSel
                              ? "rgba(69, 26, 3, 0.2)"
                              : "rgba(15, 23, 42, 0.6)",
                            border: isFull
                              ? "1px solid rgba(51, 65, 85, 0.6)"
                              : isSel
                              ? "1px solid rgba(245, 158, 11, 0.6)"
                              : "1px solid rgba(51, 65, 85, 0.8)",
                            opacity: isFull ? 0.65 : 1,
                            transition: "all 0.15s ease"
                          },
                          children: [
                            /* Checkbox e Nome do Item */
                            (0, ct.jsxs)("div", {
                              style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 },
                              children: [
                                (0, ct.jsx)("input", {
                                  type: "checkbox",
                                  checked: isSel,
                                  disabled: isFull,
                                  onChange: () => {},
                                  className: "accent-amber-500 cursor-pointer disabled:cursor-not-allowed",
                                  style: { width: "13px", height: "13px", flexShrink: 0 }
                                }),
                                (0, ct.jsx)("span", {
                                  style: {
                                    fontWeight: 600,
                                    color: isFull ? "#94a3b8" : "#f1f5f9",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  },
                                  title: item.name,
                                  children: item.name
                                })
                              ]
                            }),
                            /* Valores numericos ampliados e Badge bem proximos */
                            (0, ct.jsxs)("div", {
                              style: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, fontFamily: "monospace" },
                              children: [
                                (0, ct.jsx)("span", { style: { fontSize: "11px", fontWeight: "bold", color: "#94a3b8" }, children: curVal }),
                                (0, ct.jsx)("span", { style: { fontSize: "10px", color: "#475569" }, children: "→" }),
                                (0, ct.jsxs)("span", {
                                  style: {
                                    fontSize: "12px",
                                    fontWeight: 900,
                                    color: isFull ? "#34d399" : "#fcd34d"
                                  },
                                  children: isFull ? `${curVal}/${maxVal}` : `${nextVal}/${maxVal}`
                                }),
                                isFull ? (
                                  (0, ct.jsx)("span", {
                                    style: {
                                      fontSize: "9px",
                                      fontWeight: 600,
                                      padding: "2px 5px",
                                      borderRadius: "4px",
                                      background: "rgba(6, 78, 59, 0.8)",
                                      color: "#34d399",
                                      border: "1px solid rgba(6, 95, 70, 0.6)",
                                      fontFamily: "sans-serif"
                                    },
                                    children: "Cheio"
                                  })
                                ) : (
                                  (0, ct.jsx)("span", {
                                    style: {
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      padding: "2px 5px",
                                      borderRadius: "4px",
                                      background: "rgba(245, 158, 11, 0.2)",
                                      color: "#fcd34d",
                                      border: "1px solid rgba(245, 158, 11, 0.4)",
                                      fontFamily: "sans-serif"
                                    },
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
          style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "#020617",
            borderTop: "1px solid #1e293b",
            gap: "12px"
          },
          children: [
            (0, ct.jsxs)("span", {
              style: {
                fontSize: "12px",
                color: "#cbd5e1",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              children: [
                (0, ct.jsx)("strong", { style: { color: "#fbbf24", fontWeight: "bold" }, children: selCount }),
                ` ${selCount === 1 ? "item selecionado" : "itens selecionados"}`
              ]
            }),
            (0, ct.jsxs)("div", {
              style: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
              children: [
                (0, ct.jsx)("button", {
                  type: "button",
                  onClick: onClose,
                  style: {
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0
                  },
                  children: "Cancelar"
                }),
                (0, ct.jsxs)("button", {
                  type: "button",
                  onClick: handleConfirm,
                  disabled: selCount === 0 || charManaList.length === 0,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background: selCount === 0 || charManaList.length === 0 ? "#64748b" : "#f59e0b",
                    color: "#020617",
                    border: "none",
                    cursor: selCount === 0 || charManaList.length === 0 ? "not-allowed" : "pointer",
                    opacity: selCount === 0 || charManaList.length === 0 ? 0.4 : 1,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  },
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

print("mesa.html updated successfully with inline-styled PassDayModalComponent!")
