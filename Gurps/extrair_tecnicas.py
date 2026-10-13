"""
Gera um CSV com todas as TÉCNICAS (techniques) encontradas nos seus livros GURPS.

Colunas: livro; pagina; tecnica; dificuldade; cinematica; defaults; pre_requisitos;
         descricao; modificadores

Uso:
    pip install pdfplumber
    python extrair_tecnicas.py
    python extrair_tecnicas.py --pasta "C:\\outra\\pasta" --saida tecnicas.csv

As técnicas têm o mesmo formato das perícias nos livros GURPS 4e (título em
negrito-itálico, linha de dificuldade, Default(s) e Prerequisite(s)), só que a
linha de dificuldade não tem atributo: "Average" ou "Hard". A leitura das páginas
(colunas, quadros laterais, rótulos) é a do extrair_pericias.py, que precisa estar
na mesma pasta. Técnicas marcadas com * são cinemáticas (coluna "cinematica").
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

# extrair_pericias.py fica na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import (Pericia, PASTA_PADRAO, eh_titulo_pericia, eh_tipo, eh_secao,
                              ler_pagina, nome_bonito, texto)

DIFICULDADE = re.compile(r"^(Average|Hard)\b")
# A tabela de custo das técnicas do Basic Set (p. B230) fica no meio do texto, sem quadro em volta:
# "Difficulty of Technique Average Hard 0 points 0 points 1 point ... +1 point +1 point".
TABELA_CUSTO = re.compile(r"^Difficulty of Technique Average Hard(?:\s+\+?\d+ points?)+\s*")
CAMPOS = ["livro", "pagina", "tecnica", "dificuldade", "cinematica", "defaults", "pre_requisitos",
          "descricao", "modificadores"]


class Tecnica(Pericia):
    def finalizar(self):
        d = super().finalizar()
        m = DIFICULDADE.match(d["tipo"])
        # Alguns livros anunciam a técnica no título ("New Technique: Sight-Reading").
        nome = re.sub(r"^New Technique:\s*", "", d["pericia"])
        return {"livro": d["livro"], "pagina": d["pagina"], "tecnica": nome,
                "dificuldade": m.group(1) if m else "", "cinematica": d["cinematica"],
                "defaults": d["defaults"], "pre_requisitos": d["pre_requisitos"],
                "descricao": TABELA_CUSTO.sub("", d["descricao"]), "modificadores": d["modificadores"]}


def eh_inicio_tecnica(ln):
    return eh_tipo(ln[0]) and bool(DIFICULDADE.match(texto(ln)))


def processar(caminho, nome_livro, saida, contador):
    atual = None

    def fechar():
        nonlocal atual
        if atual:
            d = atual.finalizar()
            # Sem Default nem Prerequisite não é técnica (um título qualquer seguido de "Hard...").
            if d["dificuldade"] and (d["defaults"] or d["pre_requisitos"]):
                saida.writerow(d)
                contador[nome_livro] += 1
            atual = None

    with pdfplumber.open(caminho) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            linhas, numero = ler_pagina(page)
            page.flush_cache()
            pagina = numero or str(i + 1)
            k = 0
            while k < len(linhas):
                ln, recuada = linhas[k]
                if all(eh_titulo_pericia(w) for w in ln):
                    nome = texto(ln)
                    j = k + 1
                    # título quebrado em duas linhas (e não dois títulos seguidos)
                    if j + 1 < len(linhas) and all(eh_titulo_pericia(w) for w in linhas[j][0]) \
                            and eh_inicio_tecnica(linhas[j + 1][0]) and not eh_inicio_tecnica(linhas[j][0]):
                        nome += " " + texto(linhas[j][0])
                        j += 1
                    if j < len(linhas) and eh_inicio_tecnica(linhas[j][0]):
                        fechar()
                        atual = Tecnica(nome_livro, pagina, nome)
                        k = j
                        continue
                    # outro título qualquer encerra a técnica em andamento
                    fechar()
                elif atual and all(eh_secao(w) for w in ln):
                    fechar()
                elif atual:
                    atual.adicionar(ln, recuada)
                k += 1
            if (i + 1) % 50 == 0:
                print(f"    página {i + 1}/{total}...")
            gc.collect()
    fechar()


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
    arquivo = a.saida or (a.pasta / "tecnicas.csv")
    contador = Counter()
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                processar(p, livro, w, contador)
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            print(f"  {contador[livro]} técnicas")
    print(f"\nTotal: {sum(contador.values())} técnicas -> {arquivo}")


if __name__ == "__main__":
    main()
