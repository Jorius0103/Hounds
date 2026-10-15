"""
Gera um CSV com todas as ARMADURAS e ESCUDOS das tabelas dos seus livros GURPS.

Colunas: livro; pagina; tipo; tabela; categoria; pericia; defaults; tl; armadura; modo; local; rd; bd;
         pv; rd_cobertura; custo; peso; vestir; cl; notas; rodape

Uma linha por linha da tabela do livro. "tipo" é Armor (tabelas com DR) ou Shield (com DB);
"tabela" é o título da tabela no livro ("Horse Armor (Barding) Table" separa as bardas).
"categoria" é o subtítulo da tabela de armaduras ("Body Armor", "Headgear"); nos escudos,
"pericia" e "defaults" saem do título do grupo ("SHIELD (DX-4, or other Shield at -2)").
A peça que se acrescenta a outra ("+ Visor" embaixo de "Frag Helmet") vem com o nome da peça
de cima e o que o livro escreve em "modo".
Os valores ficam como no livro: local (Location; "torso" na tabela de Torso Armor do Low-Tech),
rd (DR), bd (DB, bônus de defesa), pv (HP; o "DR/HP" dos escudos vai para rd e pv),
rd_cobertura (Cover DR), custo (Cost), peso (Weight), vestir (Don, segundos para vestir),
cl (LC, classe de legalidade), notas (Notes). "rodape" traz o texto das notas numeradas
citadas em "notas" ([1], [2]...).

Uso:
    pip install pdfplumber
    python extrair_armaduras.py
    python extrair_armaduras.py --pasta "C:\\outra\\pasta" --saida armaduras.csv

A leitura das tabelas é a do extrair_armas.py (que usa o extrair_pericias.py); os dois
precisam estar na mesma pasta.
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, sys
from collections import Counter
from pathlib import Path

# extrair_armas.py fica na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_armas import PASTA_PADRAO, ler_livro, nome_bonito, separar_grupo

CAMPOS = ["livro", "pagina", "tipo", "tabela", "categoria", "pericia", "defaults", "tl", "armadura", "modo",
          "local", "rd", "bd", "pv", "rd_cobertura", "custo", "peso", "vestir", "cl", "notas", "rodape"]
# coluna do livro -> coluna do CSV
COLUNAS = {"Location": "local", "DR": "rd", "DB": "bd", "Cover DR": "rd_cobertura", "Cost": "custo",
           "Weight": "peso", "Don": "vestir", "LC": "cl", "Notes": "notas"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pasta", type=Path, default=PASTA_PADRAO)
    ap.add_argument("--saida", type=Path, default=None)
    a = ap.parse_args()
    if not a.pasta.is_dir():
        sys.exit(f"Pasta não encontrada: {a.pasta}")
    pdfs = sorted(a.pasta.rglob("*.pdf"))
    if not pdfs:
        sys.exit(f"Nenhum PDF em {a.pasta}")
    arquivo = a.saida or (a.pasta / "armaduras.csv")
    contador, sem_nota = Counter(), []
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                pecas = [ln for ln in ler_livro(p, livro) if ln["tipo"] in ("Armor", "Shield")]
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            for ln in pecas:
                pericia, defaults = separar_grupo(ln["grupo"]) if ln["tipo"] == "Shield" else ("", "")
                v = ln["valores"]
                d = {"livro": livro, "pagina": ln["pagina"], "tipo": ln["tipo"], "tabela": ln["tabela"], "categoria": ln["categoria"],
                     "pericia": pericia, "defaults": defaults, "tl": ln["tl"], "armadura": ln["nome"],
                     "modo": ln["modo"], "pv": "", "rodape": ln["rodape"]}
                for col, campo in COLUNAS.items():
                    d[campo] = v.get(col, "")
                if "DR/HP" in v:
                    d["rd"], _, d["pv"] = v["DR/HP"].partition("/")
                if ln["coluna_do_nome"] == "Torso Armor" and not d["local"]:
                    d["local"] = "torso"
                w.writerow(d)
                contador[livro] += not ln["modo"]
                sem_nota += [f"{livro} p.{ln['pagina']} {ln['nome']}: [{n}]" for n in ln["sem_nota"]]
            if pecas:
                print(f"  {contador[livro]} armaduras e escudos")
    print(f"\nTotal: {sum(contador.values())} armaduras e escudos -> {arquivo}")
    if sem_nota:
        print("Notas citadas que não foram achadas (confira manualmente):")
        for x in sem_nota:
            print("  -", x)


if __name__ == "__main__":
    main()
