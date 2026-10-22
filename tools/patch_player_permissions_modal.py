# -*- coding: utf-8 -*-
import sys

def get_new_portal_code():
    return '''isMestre&&openPerms?E1().createPortal((0,q.jsxs)("div",{
  className:"fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm",
  style:{
    position:"fixed",
    inset:0,
    zIndex:99999,
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    padding:"16px",
    background:"rgba(2,6,23,0.85)",
    backdropFilter:"blur(4px)",
    WebkitBackdropFilter:"blur(4px)",
    overflowY:"auto"
  },
  onKeyDown:x=>{if(x.key==="Escape")setOpenPerms(!1)},
  onClick:x=>{if(x.target===x.currentTarget)setOpenPerms(!1)},
  children:[
    (0,q.jsxs)("div",{
      className:"relative flex flex-col overflow-hidden",
      style:{
        position:"relative",
        margin:"auto",
        width:"100%",
        maxWidth:"580px",
        maxHeight:"85vh",
        display:"flex",
        flexDirection:"column",
        background:"#0f172a",
        border:"1px solid rgba(245, 158, 11, 0.35)",
        borderRadius:"16px",
        boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        overflow:"hidden"
      },
      children:[
        /* Header compacto */
        (0,q.jsxs)("div",{
          style:{
            flexShrink:0,
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            padding:"10px 18px",
            borderBottom:"1px solid rgba(245, 158, 11, 0.2)",
            background:"linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)"
          },
          children:[
            (0,q.jsxs)("div",{
              style:{display:"flex",alignItems:"center",gap:"8px",minWidth:0},
              children:[
                (0,q.jsx)("div",{
                  style:{
                    width:"28px",
                    height:"28px",
                    borderRadius:"7px",
                    background:"rgba(245, 158, 11, 0.15)",
                    border:"1px solid rgba(245, 158, 11, 0.4)",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    color:"#fbbf24",
                    flexShrink:0
                  },
                  children:(0,q.jsxs)("svg",{
                    viewBox:"0 0 24 24",
                    fill:"none",
                    stroke:"currentColor",
                    strokeWidth:"2",
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    style:{width:"16px",height:"16px"},
                    children:[
                      (0,q.jsx)("path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}),
                      (0,q.jsx)("circle",{cx:"9",cy:"7",r:"4"}),
                      (0,q.jsx)("path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}),
                      (0,q.jsx)("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})
                    ]
                  })
                }),
                (0,q.jsxs)("div",{
                  style:{minWidth:0},
                  children:[
                    (0,q.jsx)("h2",{
                      style:{fontSize:"14px",fontWeight:"bold",color:"#ffffff",margin:0},
                      children:"Permiss\u00f5es dos Jogadores na Mesa de RPG"
                    }),
                    (0,q.jsx)("p",{
                      style:{fontSize:"10px",color:"#94a3b8",margin:"1px 0 0 0"},
                      children:"Defina em tempo real quem pode editar fichas e movimentar tokens"
                    })
                  ]
                })
              ]
            }),
            (0,q.jsx)("button",{
              type:"button",
              onClick:()=>setOpenPerms(!1),
              style:{
                padding:"5px",
                borderRadius:"7px",
                cursor:"pointer",
                flexShrink:0,
                background:"transparent",
                border:"none",
                color:"#94a3b8",
                display:"flex",
                alignItems:"center",
                justifyContent:"center"
              },
              title:"Fechar (Esc)",
              children:(0,q.jsxs)("svg",{
                viewBox:"0 0 24 24",
                fill:"none",
                stroke:"currentColor",
                strokeWidth:"2",
                strokeLinecap:"round",
                strokeLinejoin:"round",
                style:{width:"16px",height:"16px"},
                children:[
                  (0,q.jsx)("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),
                  (0,q.jsx)("line",{x1:"6",y1:"6",x2:"18",y2:"18"})
                ]
              })
            })
          ]
        }),

        /* Subheader / Busca a esquerda e Botoes a direita na mesma linha */
        (0,q.jsxs)("div",{
          style:{
            flexShrink:0,
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:"10px",
            padding:"8px 18px",
            background:"rgba(2, 6, 23, 0.8)",
            borderBottom:"1px solid rgba(51, 65, 85, 0.8)"
          },
          children:[
            /* Campo de busca a esquerda */
            (0,q.jsxs)("div",{
              style:{position:"relative",width:"200px",maxWidth:"45%"},
              children:[
                (0,q.jsxs)("svg",{
                  viewBox:"0 0 24 24",
                  fill:"none",
                  stroke:"currentColor",
                  strokeWidth:"2",
                  strokeLinecap:"round",
                  strokeLinejoin:"round",
                  style:{position:"absolute",left:"9px",top:"50%",transform:"translateY(-50%)",width:"12px",height:"12px",color:"#64748b"},
                  children:[
                    (0,q.jsx)("circle",{cx:"11",cy:"11",r:"8"}),
                    (0,q.jsx)("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})
                  ]
                }),
                (0,q.jsx)("input",{
                  type:"text",
                  value:permSearch,
                  onChange:x=>setPermSearch(x.target.value),
                  placeholder:"Buscar jogador...",
                  style:{
                    width:"100%",
                    boxSizing:"border-box",
                    background:"rgba(2, 6, 23, 0.9)",
                    border:"1px solid #1e293b",
                    borderRadius:"6px",
                    padding:"4px 8px 4px 26px",
                    fontSize:"11px",
                    color:"#ffffff",
                    outline:"none"
                  }
                })
              ]
            }),

            /* Botoes Liberar Todos e Bloquear Todos a direita */
            (0,q.jsxs)("div",{
              style:{display:"flex",alignItems:"center",gap:"6px",flexShrink:0},
              children:[
                (0,q.jsxs)("button",{
                  type:"button",
                  onClick:()=>setAllPerm&&setAllPerm(!0),
                  style:{
                    display:"flex",
                    alignItems:"center",
                    gap:"4px",
                    padding:"4px 10px",
                    fontSize:"10px",
                    fontWeight:"bold",
                    background:"rgba(6, 78, 59, 0.8)",
                    color:"#6ee7b7",
                    border:"1px solid rgba(6, 95, 70, 0.8)",
                    borderRadius:"5px",
                    cursor:"pointer"
                  },
                  title:"Conceder permiss\u00e3o de edi\u00e7\u00e3o a todos os jogadores",
                  children:[
                    (0,q.jsx)("svg",{
                      viewBox:"0 0 24 24",
                      fill:"none",
                      stroke:"currentColor",
                      strokeWidth:"2.5",
                      strokeLinecap:"round",
                      strokeLinejoin:"round",
                      style:{width:"11px",height:"11px"},
                      children:(0,q.jsx)("polyline",{points:"20 6 9 17 4 12"})
                    }),
                    (0,q.jsx)("span",{children:"Liberar Todos"})
                  ]
                }),
                (0,q.jsxs)("button",{
                  type:"button",
                  onClick:()=>setAllPerm&&setAllPerm(!1),
                  style:{
                    display:"flex",
                    alignItems:"center",
                    gap:"4px",
                    padding:"4px 10px",
                    fontSize:"10px",
                    fontWeight:500,
                    background:"#1e293b",
                    color:"#cbd5e1",
                    border:"1px solid #334155",
                    borderRadius:"5px",
                    cursor:"pointer"
                  },
                  title:"Colocar todos os jogadores em modo espectador",
                  children:[
                    (0,q.jsxs)("svg",{
                      viewBox:"0 0 24 24",
                      fill:"none",
                      stroke:"currentColor",
                      strokeWidth:"2.5",
                      style:{width:"11px",height:"11px"},
                      children:[
                        (0,q.jsx)("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),
                        (0,q.jsx)("line",{x1:"6",y1:"6",x2:"18",y2:"18"})
                      ]
                    }),
                    (0,q.jsx)("span",{children:"Bloquear Todos"})
                  ]
                })
              ]
            })
          ]
        }),

        /* Lista de Jogadores: compacto verticalmente para caber 10 jogadores sem rolar */
        (0,q.jsx)("div",{
          style:{
            flex:"1 1 auto",
            minHeight:0,
            overflowY:"auto",
            padding:"8px 18px",
            display:"flex",
            flexDirection:"column",
            gap:"4px"
          },
          children:filteredPlayers.length===0?(
            (0,q.jsxs)("div",{
              style:{
                padding:"20px 16px",
                textAlign:"center",
                fontSize:"11px",
                color:"#94a3b8",
                background:"rgba(2, 6, 23, 0.4)",
                borderRadius:"10px",
                border:"1px dashed #334155",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                gap:"6px"
              },
              children:[
                (0,q.jsx)("div",{
                  style:{
                    width:"32px",
                    height:"32px",
                    borderRadius:"8px",
                    background:"rgba(30, 41, 59, 0.6)",
                    border:"1px solid #334155",
                    color:"#64748b",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center"
                  },
                  children:(0,q.jsxs)("svg",{
                    viewBox:"0 0 24 24",
                    fill:"none",
                    stroke:"currentColor",
                    strokeWidth:"2",
                    strokeLinecap:"round",
                    strokeLinejoin:"round",
                    style:{width:"16px",height:"16px"},
                    children:[
                      (0,q.jsx)("path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}),
                      (0,q.jsx)("circle",{cx:"9",cy:"7",r:"4"}),
                      (0,q.jsx)("path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}),
                      (0,q.jsx)("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})
                    ]
                  })
                }),
                (0,q.jsx)("div",{
                  style:{fontWeight:"bold",color:"#e2e8f0"},
                  children:playerUsers.length===0?"Nenhum jogador cadastrado no sistema ainda.":"Nenhum jogador encontrado para a busca."
                }),
                playerUsers.length===0&&(0,q.jsx)("p",{
                  style:{fontSize:"10px",color:"#64748b",maxWidth:"300px",margin:0,lineHeight:1.4},
                  children:"Cadastre contas com o perfil Jogador na aba Usu\u00e1rios do Hub para gerenciar o acesso aqui."
                })
              ]
            })
          ):filteredPlayers.map(p=>{
            let pid=String(p.id||"").toLowerCase().trim();
            let pnm=String(p.name||"").toLowerCase().trim();
            let isAllowed=(edList||[]).some(x=>{
              if(!x)return !1;
              let s=String(x).toLowerCase().trim(),
                  sC=s.replace(/^user-/,""),
                  pidC=pid.replace(/^user-/,""),
                  pnmC=pnm.replace(/^user-/,"");
              return s===pid||s===pnm||sC===pidC||sC===pnmC||s==="user-"+pnmC||pid==="user-"+s;
            });
            let ini=(p.name||"?").slice(0,2).toUpperCase();
            return(0,q.jsxs)("div",{
              key:p.id,
              onClick:()=>{if(togPerm)togPerm(p.id)},
              style:{
                padding:"4px 10px",
                minHeight:"34px",
                borderRadius:"8px",
                border:isAllowed?"1px solid rgba(16, 185, 129, 0.4)":"1px solid #1e293b",
                background:isAllowed?"rgba(6, 78, 59, 0.2)":"rgba(2, 6, 23, 0.6)",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:"10px",
                cursor:"pointer",
                userSelect:"none",
                transition:"all 0.15s ease"
              },
              role:"button",
              tabIndex:0,
              onKeyDown:e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();if(togPerm)togPerm(p.id)}},
              title:isAllowed?`Clique para retirar permiss\u00e3o de edi\u00e7\u00e3o de ${p.name}`:`Clique para dar permiss\u00e3o de edi\u00e7\u00e3o para ${p.name}`,
              children:[
                /* Avatar, Nome e Texto de Permissão ao lado do Nome */
                (0,q.jsxs)("div",{
                  style:{display:"flex",alignItems:"center",gap:"8px",minWidth:0,flex:"1 1 auto"},
                  children:[
                    (0,q.jsx)("div",{
                      style:{
                        width:"26px",
                        height:"26px",
                        borderRadius:"6px",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        fontWeight:"bold",
                        fontSize:"10px",
                        flexShrink:0,
                        background:isAllowed?"rgba(16, 185, 129, 0.2)":"#1e293b",
                        color:isAllowed?"#6ee7b7":"#94a3b8",
                        border:isAllowed?"1px solid rgba(16, 185, 129, 0.4)":"1px solid #334155"
                      },
                      children:ini
                    }),
                    (0,q.jsxs)("div",{
                      style:{display:"flex",alignItems:"center",gap:"6px",minWidth:0,flexWrap:"nowrap"},
                      children:[
                        (0,q.jsx)("span",{
                          style:{fontSize:"12px",fontWeight:"bold",color:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"160px"},
                          children:p.name||"Sem nome"
                        }),
                        isAllowed?(
                          (0,q.jsxs)("span",{
                            style:{
                              display:"inline-flex",
                              alignItems:"center",
                              gap:"3px",
                              fontSize:"10px",
                              fontWeight:600,
                              color:"#34d399",
                              background:"rgba(6, 78, 59, 0.5)",
                              border:"1px solid rgba(16, 185, 129, 0.35)",
                              padding:"1px 6px",
                              borderRadius:"4px",
                              whiteSpace:"nowrap",
                              flexShrink:0
                            },
                            children:[
                              (0,q.jsxs)("svg",{
                                viewBox:"0 0 24 24",
                                fill:"none",
                                stroke:"currentColor",
                                strokeWidth:"2",
                                strokeLinecap:"round",
                                strokeLinejoin:"round",
                                style:{width:"10px",height:"10px",flexShrink:0},
                                children:[
                                  (0,q.jsx)("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}),
                                  (0,q.jsx)("path",{d:"m9 12 2 2 4-4"})
                                ]
                              }),
                              "Editor Liberado"
                            ]
                          })
                        ):(
                          (0,q.jsxs)("span",{
                            style:{
                              display:"inline-flex",
                              alignItems:"center",
                              gap:"3px",
                              fontSize:"10px",
                              fontWeight:500,
                              color:"#94a3b8",
                              background:"rgba(30, 41, 59, 0.5)",
                              border:"1px solid #334155",
                              padding:"1px 6px",
                              borderRadius:"4px",
                              whiteSpace:"nowrap",
                              flexShrink:0
                            },
                            children:[
                              (0,q.jsxs)("svg",{
                                viewBox:"0 0 24 24",
                                fill:"none",
                                stroke:"currentColor",
                                strokeWidth:"2",
                                strokeLinecap:"round",
                                strokeLinejoin:"round",
                                style:{width:"10px",height:"10px",flexShrink:0},
                                children:[
                                  (0,q.jsx)("path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"}),
                                  (0,q.jsx)("circle",{cx:"12",cy:"12",r:"3"})
                                ]
                              }),
                              "Modo Espectador"
                            ]
                          })
                        )
                      ]
                    })
                  ]
                }),

                /* Segmented Control */
                (0,q.jsxs)("div",{
                  style:{
                    display:"flex",
                    alignItems:"center",
                    gap:"3px",
                    background:"#020617",
                    padding:"2px",
                    borderRadius:"6px",
                    border:"1px solid #1e293b",
                    flexShrink:0
                  },
                  children:[
                    (0,q.jsxs)("button",{
                      type:"button",
                      onClick:e=>{
                        e.stopPropagation();
                        if(isAllowed&&togPerm)togPerm(p.id);
                      },
                      style:{
                        padding:"3px 8px",
                        borderRadius:"4px",
                        fontSize:"10px",
                        fontWeight:!isAllowed?"bold":500,
                        display:"flex",
                        alignItems:"center",
                        gap:"3px",
                        background:!isAllowed?"#1e293b":"transparent",
                        color:!isAllowed?"#f1f5f9":"#64748b",
                        border:!isAllowed?"1px solid #334155":"1px solid transparent",
                        cursor:"pointer"
                      },
                      children:[
                        (0,q.jsxs)("svg",{
                          viewBox:"0 0 24 24",
                          fill:"none",
                          stroke:"currentColor",
                          strokeWidth:"2",
                          strokeLinecap:"round",
                          strokeLinejoin:"round",
                          style:{width:"11px",height:"11px"},
                          children:[
                            (0,q.jsx)("path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"}),
                            (0,q.jsx)("circle",{cx:"12",cy:"12",r:"3"})
                          ]
                        }),
                        (0,q.jsx)("span",{children:"Espectador"})
                      ]
                    }),
                    (0,q.jsxs)("button",{
                      type:"button",
                      onClick:e=>{
                        e.stopPropagation();
                        if(!isAllowed&&togPerm)togPerm(p.id);
                      },
                      style:{
                        padding:"3px 8px",
                        borderRadius:"4px",
                        fontSize:"10px",
                        fontWeight:isAllowed?"bold":500,
                        display:"flex",
                        alignItems:"center",
                        gap:"3px",
                        background:isAllowed?"#059669":"transparent",
                        color:isAllowed?"#ffffff":"#64748b",
                        border:isAllowed?"1px solid #34d399":"1px solid transparent",
                        cursor:"pointer",
                        boxShadow:isAllowed?"0 1px 3px rgba(0,0,0,0.3)":"none"
                      },
                      children:[
                        (0,q.jsx)("svg",{
                          viewBox:"0 0 24 24",
                          fill:"none",
                          stroke:"currentColor",
                          strokeWidth:"2.5",
                          strokeLinecap:"round",
                          strokeLinejoin:"round",
                          style:{width:"11px",height:"11px"},
                          children:(0,q.jsx)("polyline",{points:"20 6 9 17 4 12"})
                        }),
                        (0,q.jsx)("span",{children:"Editor"})
                      ]
                    })
                  ]
                })
              ]
            });
          })
        }),

        /* Footer compacto */
        (0,q.jsxs)("div",{
          style:{
            flexShrink:0,
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            padding:"8px 18px",
            borderTop:"1px solid #1e293b",
            background:"rgba(2, 6, 23, 0.6)",
            gap:"10px"
          },
          children:[
            (0,q.jsxs)("div",{
              style:{display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:"#94a3b8"},
              children:[
                (0,q.jsx)("span",{
                  style:{
                    width:"5px",
                    height:"5px",
                    borderRadius:"9999px",
                    background:"#34d399",
                    display:"inline-block",
                    boxShadow:"0 0 5px #34d399"
                  }
                }),
                (0,q.jsx)("span",{
                  children:"Sincronizado em tempo real com todos os jogadores."
                })
              ]
            }),
            (0,q.jsx)("button",{
              type:"button",
              onClick:()=>setOpenPerms(!1),
              style:{
                padding:"5px 14px",
                borderRadius:"7px",
                fontSize:"11px",
                fontWeight:"bold",
                background:"#f59e0b",
                color:"#020617",
                border:"none",
                cursor:"pointer",
                flexShrink:0,
                boxShadow:"0 2px 4px rgba(0,0,0,0.3)"
              },
              children:"Concluir"
            })
          ]
        })
      ]
    })
  ]
}),document.body):null'''

def main():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        content = f.read()

    target_start = 'isMestre&&openPerms?E1().createPortal('
    start_idx = content.find(target_start)
    if start_idx == -1:
        print('Error: Target start not found!')
        sys.exit(1)

    end_idx = content.find('):null', start_idx) + 6
    if end_idx == 5:
        print('Error: Target end not found!')
        sys.exit(1)

    print(f'Replacing slice [{start_idx}:{end_idx}] (length: {end_idx - start_idx})')

    new_code = get_new_portal_code()

    # Verify paren / brace / bracket balance of new code
    p_diff = new_code.count('(') - new_code.count(')')
    b_diff = new_code.count('{') - new_code.count('}')
    sq_diff = new_code.count('[') - new_code.count(']')
    print(f'New code balance: ()={p_diff}, {{}}={b_diff}, []={sq_diff}')
    if p_diff != 0 or b_diff != 0 or sq_diff != 0:
        print('ERROR: unbalanced brackets in new_code!')
        sys.exit(1)

    new_content = content[:start_idx] + new_code + content[end_idx:]

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(new_content)

    print('Successfully patched mesa.html!')

if __name__ == '__main__':
    main()
