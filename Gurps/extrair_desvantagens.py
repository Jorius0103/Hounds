"""
Gera um CSV com todas as DESVANTAGENS (disadvantages) dos seus livros GURPS.

Colunas: livro; pagina; desvantagem; custo; tipo; classes; autocontrole; descricao

"tipo" é Disadvantage (a desvantagem descrita ali), Expansion (Basic Set disadvantage) (o
verbete que amplia uma desvantagem do Basic Set: "Code of Honor - see p. B127", com opções
novas) ou Cross-reference (só manda para outra página).
"classes" sai dos ícones ao lado do título: Mental, Physical, Social, Exotic, Supernatural.
"autocontrole" é "sim" nas desvantagens com teste de autocontrole (marcadas com * no título ou,
no Basic Set, no custo: "-10 points*").

Uso:
    pip install pdfplumber
    python extrair_desvantagens.py
    python extrair_desvantagens.py --pasta "C:\\outra\\pasta" --saida desvantagens.csv

O script lê todos os PDFs da pasta (e subpastas) e reconhece as desvantagens pelo formato
padrão dos livros GURPS 4e: título em itálico, seguido da linha de custo em negrito
("-15 points", "Variable", "see p. B127"). Entra o título com custo negativo, ou qualquer
título com custo dentro de uma seção de desvantagens (DISADVANTAGES, DISADVANTAGE LIST).
Ficam de fora as limitações (custo em porcentagem: "-20%"), os modelos de raça e de personagem
e os meta-traços. O texto dos quadros laterais, das tabelas sombreadas e das citações em
destaque é ignorado. A leitura das páginas (colunas, quadros) é a do
extrair_pericias.py, que precisa estar na mesma pasta.
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
    import pypdfium2
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

# extrair_pericias.py fica na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import PASTA_PADRAO, agrupar, dentro, juntar, nome_bonito, quadros, texto

CAMPOS = ["livro", "pagina", "desvantagem", "custo", "tipo", "classes", "autocontrole", "descricao"]
# Os ícones de tipo, na fonte GURPSICONS: o caractere de cada um.
CLASSES = {"1": "Exotic", "2": "Mental", "3": "Physical", "4": "Social", "5": "Supernatural"}
CUSTO = re.compile(r"^(?:[-–−+]?\s?\d|Variable|Varies|[Ss]ee\s)")
NEGATIVO = re.compile(r"^[-–−]\s?\d")
# Páginas candidatas (texto rápido, pelo pypdfium2): uma linha de custo de desvantagem, ou o
# título de uma seção de desvantagens.
CANDIDATA = re.compile(r"^(?:[-–−]\d+ (?:or|to) [-–−]?\d+ points|[-–−]\d+ points?\b|[Ss]ee pp?\. B\d+|Variable)\s*$|DISADVANTAGE", re.M)


def fonte(w):
    return w["fontname"].split("+")[-1]


def italico(w):
    return "Italic" in fonte(w)


def eh_secao(ln):
    """Título de seção ou de capítulo (fonte Black)."""
    return all("Black" in fonte(w) for w in ln) and ln[0]["size"] >= 11.5


def eh_titulo(ln):
    """Título de um verbete: itálico grande ("Absent-Mindedness", "Code of Honor")."""
    return all(italico(w) and w["size"] >= 12.5 for w in ln if w["text"] not in "*/")


def eh_negrito(ln):
    p = ln[0]
    return ("Bold" in fonte(p) or "SemiB" in fonte(p)) and not italico(p) and 9 <= p["size"] < 12.5


def eh_custo(ln):
    return eh_negrito(ln) and bool(CUSTO.match(texto(ln)))


def linha_de_custo(ln):
    """O texto do custo, sem as palavras (menores) de uma tabela vizinha na mesma altura."""
    return texto([w for w in ln if abs(w["size"] - ln[0]["size"]) < 0.6])


def tabelas(page):
    """Os fundos sombreados das tabelas (os fundos da página toda são mais largos): a tabela no meio
    do texto ("Short Lifespan") misturaria os números com as frases."""
    return [(r["x0"], r["top"], r["x1"], r["bottom"]) for r in page.rects
            if r.get("fill") and 100 < r["x1"] - r["x0"] < 0.75 * page.width and r["bottom"] - r["top"] > 20]


def faixas_pretas(words):
    """Os títulos de seção da página (fonte Black), por altura: {id da palavra: faixa} e o texto de
    cada faixa. Um título grande vem em pedaços, um em cada coluna ("D" "ISADVANTAGE" "L" "IST")."""
    pretas = sorted((w for w in words if "Black" in fonte(w) and w["size"] >= 11.5), key=lambda w: w["bottom"])
    faixas = []
    for w in pretas:
        if faixas and w["bottom"] - faixas[-1][0]["bottom"] < 4:
            faixas[-1].append(w)
        else:
            faixas.append([w])
    da_palavra = {id(w): i for i, f in enumerate(faixas) for w in f}
    textos = ["".join(w["text"] for w in sorted(f, key=lambda w: w["x0"])).upper() for f in faixas]
    return da_palavra, textos


def classes_do_titulo(lns, icones):
    """Os ícones logo depois do título, na mesma linha; ou no começo da linha de baixo, quando o
    título enche a coluna ("Decreased Time Rate")."""
    # o fim do nome: "Addiction [ícone] / [ícone]" tem um ícone antes da barra
    nome = [w for w in lns[-1] if w["text"] not in "*/"] or lns[-1]
    fim, base, inicio = nome[-1]["x1"], nome[-1]["bottom"], lns[0][0]["x0"]

    def perto(w):
        d = w["bottom"] - base
        if abs(d) < 6:
            return -2 <= w["x0"] - fim < 45
        return 6 <= d <= 18 and -2 <= w["x0"] - inicio < 40

    achados = [w for w in icones if perto(w)]
    out = []
    for w in sorted(achados, key=lambda w: w["x0"]):
        for c in w["text"]:
            if c in CLASSES and CLASSES[c] not in out:
                out.append(CLASSES[c])
    return out


class Desvantagem:
    def __init__(self, livro, pagina, nome, classes):
        self.livro, self.pagina, self.classes = livro, pagina, classes
        nome = re.sub(r"[\s/]+$", "", nome)
        self.autocontrole = "*" in nome
        # "New Disadvantage/Advantage: Twisted Mana Generator": só o nome
        nome = re.sub(r"^New (?:Advantage/|Disadvantage/)?(?:Dis)?[Aa]dvantages?(?:/(?:Dis)?[Aa]dvantage)?:\s*", "", nome)
        self.nome = re.sub(r"\s*\*\s*", " ", nome).strip()
        self.custo = []
        self.partes = []

    def adicionar(self, ln):
        t = texto(ln)
        # Subtítulo dentro do verbete ("Effects", "Cost (per day)"): vira "Effects: ...", que a
        # revisão dos textos (tools/gurps-texto.mjs) põe num parágrafo.
        if eh_negrito(ln) and not t.endswith((":", ".")):
            t += ":"
        self.partes.append(t)

    def finalizar(self):
        """A linha do CSV, ou None no que não é desvantagem: o modelo de uma raça ou de um personagem
        ("Orc -9 points", com Attribute Modifiers, Advantages, Disadvantages...) e o meta-traço
        ("New Meta-Trait: Animal Ally")."""
        custo, descricao = juntar(self.custo), juntar(self.partes)
        # o Basic Set marca o autocontrole no custo ("-10 points*")
        if "*" in custo:
            self.autocontrole = True
            custo = re.sub(r"\s*\*\s*", " ", custo).strip()
        if "Meta-Trait" in self.nome or re.search(r"\bAttribute Modifiers:|\bSecondary Characteristic Modifiers:|\bAdvantages:.*\bDisadvantages:", descricao):
            return None
        if re.match(r"^[Ss]ee\b", custo):
            # Num livro de expansão, o verbete amplia a desvantagem do Basic Set; no Basic Set
            # (ou sem texto), só manda para a outra página.
            tipo = "Expansion (Basic Set disadvantage)" if re.search(r"\bB\d", custo) and self.partes else "Cross-reference"
        else:
            tipo = "Disadvantage"
        return {"livro": self.livro, "pagina": self.pagina, "desvantagem": self.nome, "custo": custo,
                "tipo": tipo, "classes": ", ".join(self.classes), "autocontrole": "sim" if self.autocontrole else "",
                "descricao": descricao}


def paginas_candidatas(caminho):
    pdf = pypdfium2.PdfDocument(str(caminho))
    try:
        achadas = [i for i in range(len(pdf)) if CANDIDATA.search(pdf[i].get_textpage().get_text_range())]
        n = len(pdf)
    finally:
        pdf.close()
    # a página seguinte entra pelo verbete que continua nela
    return sorted(set(achadas) | {i + 1 for i in achadas if i + 1 < n})


def processar(caminho, nome_livro, saida, contador):
    paginas = paginas_candidatas(caminho)
    atual, secao, anterior = None, False, None

    def fechar():
        nonlocal atual
        linha = atual and atual.finalizar()
        if linha:
            saida.writerow(linha)
            contador[nome_livro] += 1
        atual = None

    with pdfplumber.open(caminho) as pdf:
        for i in paginas:
            if anterior is not None and i != anterior + 1:
                fechar()  # páginas puladas: o verbete e a seção não continuam
                secao = False
            anterior = i
            page = pdf.pages[i]
            h = page.height
            todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
            rodape = [w for w in todas if w["top"] >= h - 50]
            numero = next((w["text"] for w in sorted(rodape, key=lambda w: w["x0"]) if w["text"].isdigit()), "") or str(i + 1)
            caixas = quadros(page) + tabelas(page)
            icones = [w for w in todas if "ICONS" in w["fontname"].upper()]
            words = [w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper() and not dentro(w, caixas)]
            linhas = agrupar(words, page.width)
            faixa_de, faixas = faixas_pretas(words)
            vistas = set()
            k = 0
            while k < len(linhas):
                ln, recuada = linhas[k]
                if eh_secao(ln):
                    # os outros pedaços do mesmo título (nas outras colunas) não mudam nada
                    f = faixa_de[id(ln[0])]
                    if f not in vistas:
                        vistas.add(f)
                        fechar()
                        secao = "DISADVANTAGE" in faixas[f]
                    k += 1
                    continue
                if eh_titulo(ln) and recuada:
                    k += 1  # citação em destaque no meio do texto: repete o texto da página
                    continue
                if eh_titulo(ln):
                    # o título pode ocupar duas linhas; o custo vem logo depois
                    j, titulo = k + 1, [ln]
                    if (j < len(linhas) and eh_titulo(linhas[j][0]) and not linhas[j][1]
                            and 0 < linhas[j][0][0]["bottom"] - ln[0]["bottom"] < 22):
                        titulo.append(linhas[j][0])
                        j += 1
                    # uma tabela ao lado pode pôr linhas entre o título e o custo (Short Lifespan)
                    c = j
                    while (c < j + 2 and c < len(linhas) and not eh_custo(linhas[c][0]) and linhas[c][1]
                           and linhas[c][0][0]["size"] < 10.5 and linhas[c][0][0]["bottom"] - titulo[-1][0]["bottom"] < 30):
                        c += 1
                    if c < len(linhas) and eh_custo(linhas[c][0]):
                        j = c
                        custo = linha_de_custo(linhas[j][0])
                        # "see No Fine / Manipulators, p. 145": a remissão continua na linha de baixo
                        while (re.match(r"[Ss]ee\b", custo) and not re.search(r"(?:pp?\.\s*[A-Z]*\d+|above|below)\W*$", custo)
                               and j + 1 < len(linhas) and abs(linhas[j + 1][0][0]["size"] - linhas[j][0][0]["size"]) < 0.6
                               and re.search(r"Bold|SemiB", fonte(linhas[j + 1][0][0]))):
                            j += 1
                            custo += " " + linha_de_custo(linhas[j][0])
                        fechar()
                        # o custo em porcentagem é de uma limitação (Powers, Power-Ups 8)
                        if (NEGATIVO.match(custo) or secao) and "%" not in custo:
                            nome = " ".join(texto(t) for t in titulo)
                            atual = Desvantagem(nome_livro, numero, nome, classes_do_titulo(titulo, icones))
                            atual.custo.append(custo)
                        k = j + 1
                        continue
                    fechar()  # outro título encerra o verbete
                    k += 1
                    continue
                if atual:
                    atual.adicionar(ln)
                k += 1
            page.flush_cache()
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
    arquivo = a.saida or (a.pasta / "desvantagens.csv")
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
            print(f"  {contador[livro]} desvantagens")
    print(f"\nTotal: {sum(contador.values())} desvantagens -> {arquivo}")


if __name__ == "__main__":
    main()
