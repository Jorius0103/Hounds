"""
Gera um CSV com todos os ESTILOS de luta (Martial Arts styles) dos seus livros GURPS.

Colunas: livro; pagina; estilo; custo; descricao; pericias; tecnicas; pericias_cinematicas;
         tecnicas_cinematicas; perks; opc_vantagens; opc_desvantagens; opc_pericias;
         opc_tecnicas; opc_perks

Uso:
    pip install pdfplumber
    python extrair_estilos.py
    python extrair_estilos.py --pasta "C:\\outra\\pasta" --saida estilos.csv

Um estilo começa com o nome (em versalete grande no texto, ou em negrito-itálico nos
quadros laterais) seguido da linha "N points" (o custo de Style Familiarity e dos perks
obrigatórios). Depois vêm o texto e as listas com rótulo em itálico: Skills, Techniques,
Cinematic Skills, Cinematic Techniques e Perks; e, após "Optional Traits", Advantages,
Disadvantages, Skills, Techniques e Perks (colunas opc_*). As listas ficam como no livro,
separadas por ";".
Os quadros laterais são lidos à parte do texto principal: um estilo do texto que continua
na página seguinte não se mistura com uma variação em quadro.
A leitura das linhas é a do extrair_pericias.py, que precisa estar na mesma pasta.
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
from extrair_pericias import (PASTA_PADRAO, agrupar, dentro, eh_italico, eh_secao, eh_tipo,
                              eh_titulo_pericia, juntar, nome_bonito, quadros, texto)

CAMPOS = ["livro", "pagina", "estilo", "custo", "descricao", "pericias", "tecnicas",
          "pericias_cinematicas", "tecnicas_cinematicas", "perks", "opc_vantagens",
          "opc_desvantagens", "opc_pericias", "opc_tecnicas", "opc_perks"]
CUSTO = re.compile(r"^(\d+)\s+points?$", re.I)
# As listas têm recuo pendurado: o rótulo ("Techniques:") começa mais à direita que as linhas
# seguintes e que "Optional Traits". Uma palavra até FOLGA pontos à esquerda do início da
# coluna ainda é dela.
FOLGA = 14
ROTULOS = {
    "skills": "pericias", "techniques": "tecnicas", "cinematic skills": "pericias_cinematicas",
    "cinematic techniques": "tecnicas_cinematicas", "perks": "perks",
}
ROTULOS_OPC = {
    "advantages": "opc_vantagens", "disadvantages": "opc_desvantagens", "skills": "opc_pericias",
    "techniques": "opc_tecnicas", "perks": "opc_perks",
}
PEQUENAS = {"and", "or", "of", "the", "in", "on", "a", "an", "to", "with"}


def colar(ws):
    """Junta palavras de títulos em versalete ("K NIGHTLY M OUNTED" -> "KNIGHTLY MOUNTED")."""
    t, anterior = "", None
    for w in sorted(ws, key=lambda w: w["x0"]):
        if anterior is not None and w["x0"] - anterior["x1"] > 2:
            t += " "
        t += w["text"]
        anterior = w
    return t


def nome_proprio(t):
    """"SWORD-AND-SHIELD FIGHTING" -> "Sword-and-Shield Fighting" (só quando vem todo em maiúsculas)."""
    if t != t.upper():
        return t

    def maiuscula(x):
        # a primeira letra, depois de pontuação como "(" ("(tiger" -> "(Tiger")
        for i, ch in enumerate(x):
            if ch.isalpha():
                return x[:i] + ch.upper() + x[i + 1:]
        return x

    def palavra(p, primeira):
        partes = p.lower().split("-")
        return "-".join(x if (x in PEQUENAS and not (primeira and i == 0)) else maiuscula(x)
                        for i, x in enumerate(partes))
    return " ".join(palavra(p, i == 0) for i, p in enumerate(t.split()))


def eh_titulo_estilo(ln):
    """Nome de estilo: versalete grande (Black) no texto ou negrito-itálico nos quadros."""
    return all(eh_secao(w) and w["size"] >= 14 for w in ln) or all(eh_titulo_pericia(w) for w in ln)


def mesma_fonte(a, b):
    # só a família: no versalete a primeira letra de cada palavra é maior que as outras
    return a["fontname"] == b["fontname"]


def custo_da_linha(ln):
    m = CUSTO.match(texto(ln).strip()) if eh_tipo(ln[0]) else None
    return m.group(1) if m else None


class Estilo:
    def __init__(self, livro, pagina, nome, custo):
        self.d = {c: "" for c in CAMPOS}
        self.d.update(livro=livro, pagina=pagina, estilo=nome, custo=custo)
        self.partes = {c: [] for c in CAMPOS[4:]}
        self.campo = "descricao"
        self.opcional = False

    def adicionar(self, ln):
        t = texto(ln).strip()
        if eh_tipo(ln[0]) and t.lower() == "optional traits":
            self.opcional = True
            return
        # rótulo em itálico no começo da linha ("Cinematic Techniques:")
        if eh_italico(ln[0]):
            rot = []
            for k, w in enumerate(ln):
                if not eh_italico(w):
                    break
                rot.append(w["text"])
                if w["text"].endswith(":"):
                    chave = " ".join(rot)[:-1].lower()
                    tabela = ROTULOS_OPC if self.opcional else ROTULOS
                    if chave in tabela:
                        self.campo = tabela[chave]
                        ln = ln[k + 1:]
                    break
        if ln:
            self.partes[self.campo].append(texto(ln))

    def finalizar(self):
        for c, p in self.partes.items():
            self.d[c] = juntar(p)
            if c != "descricao":
                self.d[c] = self.d[c].rstrip(".").strip()
        return self.d


class Fluxo:
    """Leitura de um fluxo de texto (o principal ou o dos quadros), com o estilo em andamento."""

    def __init__(self, livro, saida, contador, quadros=False):
        self.livro, self.saida, self.contador, self.atual = livro, saida, contador, None
        self.quadros = quadros

    def fechar(self):
        if self.atual:
            d = self.atual.finalizar()
            # Todo estilo de luta lista as perícias que ensina. Sem "Skills:" é outra coisa com "N points"
            # (fichas de personagens e criaturas, estilos de magia do Thaumatology).
            if d["pericias"]:
                self.saida.writerow(d)
                self.contador[self.livro] += 1
            self.atual = None

    def ler(self, linhas, pagina):
        k = 0
        while k < len(linhas):
            ln = linhas[k][0]
            if eh_titulo_estilo(ln):
                nome, j = colar(ln), k + 1
                # nome quebrado em duas linhas (com a mesma fonte: um título de quadro em cima
                # do nome do estilo não é parte dele)
                if j + 1 < len(linhas) and eh_titulo_estilo(linhas[j][0]) and custo_da_linha(linhas[j + 1][0]) \
                        and mesma_fonte(ln[0], linhas[j][0][0]):
                    nome += " " + colar(linhas[j][0])
                    j += 1
                custo = custo_da_linha(linhas[j][0]) if j < len(linhas) else None
                # Nos quadros, um versalete sem custo é o título do quadro ("Armed Styles"), que pode
                # atravessar as colunas: não encerra o estilo em andamento.
                if not custo and self.quadros and all(eh_secao(w) for w in ln):
                    k += 1
                    continue
                self.fechar()
                if custo:
                    # "Sample Style: Way of the Flaming Fist" (Power-Ups)
                    nome = re.sub(r"^Sample Style:\s*", "", nome_proprio(nome.strip()))
                    self.atual = Estilo(self.livro, pagina, nome, custo)
                    k = j + 1
                    continue
            elif self.atual:
                self.atual.adicionar(ln)
            k += 1


def processar(caminho, nome_livro, saida, contador):
    principal, laterais = Fluxo(nome_livro, saida, contador), Fluxo(nome_livro, saida, contador, quadros=True)
    with pdfplumber.open(caminho) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            h = page.height
            todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
            rodape = [w for w in todas if w["top"] >= h - 50]
            pagina = next((w["text"] for w in sorted(rodape, key=lambda w: w["x0"]) if w["text"].isdigit()), "") or str(i + 1)
            words = [w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper()]
            caixas = quadros(page)
            page.flush_cache()
            principal.ler(agrupar([w for w in words if not dentro(w, caixas)], page.width, FOLGA), pagina)
            # cada palavra vai para o primeiro quadro que a contém
            por_caixa = {}
            for w in words:
                n = next((n for n, c in enumerate(caixas) if dentro(w, [c])), None)
                if n is not None:
                    por_caixa.setdefault(n, []).append(w)
            for n in sorted(por_caixa):
                c = caixas[n]
                laterais.ler(agrupar(por_caixa[n], c[2] - c[0], FOLGA), pagina)
            if (i + 1) % 50 == 0:
                print(f"    página {i + 1}/{total}...")
            gc.collect()
    principal.fechar()
    laterais.fechar()


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
    arquivo = a.saida or (a.pasta / "estilos.csv")
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
            print(f"  {contador[livro]} estilos")
    print(f"\nTotal: {sum(contador.values())} estilos -> {arquivo}")


if __name__ == "__main__":
    main()
