"""
Gera um CSV com os ITENS (equipamentos) dos seus livros GURPS: mochilas, ferramentas, poções,
kits, instrumentos, tesouros... As armas e as armaduras ficam em extrair_armas.py e
extrair_armaduras.py.

Colunas: livro; pagina; item; tl; categoria; custo; peso; descricao

"categoria" é o título da seção do livro ("Camping and Survival Gear", "Potions", "Cooking").
"custo" e "peso" são os do primeiro preço do verbete ("$100", "10 lbs."); o preço por unidade
leva a unidade ("$2 per pint"). Variantes com outro preço no mesmo verbete ("Large hammer:
$180, 11 lbs.") ficam na descrição.

Uso:
    pip install pdfplumber
    python extrair_itens.py
    python extrair_itens.py --pasta "C:\\outra\\pasta" --saida itens.csv

O script lê todos os PDFs da pasta (e subpastas) e reconhece os verbetes de equipamento pelos
formatos dos livros GURPS 4e:
  - parágrafo que começa com o nome em itálico, terminado em "." ou ":" ("Backpack, Frame (TL1).
    Holds 100 lbs. of gear. $100, 10 lbs."): Basic Set, Low-Tech, Dungeon Fantasy, Martial Arts;
  - linha em negrito das tabelas de tesouro, com os dados e o preço, e a descrição embaixo
    ("1-2, 1, 1 – Basin. $3, 4 lbs."): Dungeon Fantasy 8.
Só entra o verbete com preço ("$"). O texto dos quadros laterais fica de fora, e as listas de
kits (Dungeon Fantasy 13: Loadouts, linhas com "•") não são verbetes. A leitura das colunas é a
do extrair_armas.py, que precisa estar na mesma pasta (com o extrair_pericias.py).
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

# extrair_armas.py e extrair_pericias.py ficam na mesma pasta deste script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extrair_pericias import PASTA_PADRAO, dentro, juntar, nome_bonito, quadros
from extrair_armas import capitalizar, fonte, italico, ler_colunas, segue, texto

CAMPOS = ["livro", "pagina", "item", "tl", "categoria", "custo", "peso", "descricao"]
# Um preço com peso ("$100, 10 lbs.", "$1,000, 30 lbs.", "$5; 1 lb.", "$1, neg.") ou só o preço ("$10.").
NUMERO = r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?"
PRECO = re.compile(r"\$\s?((?:" + NUMERO + r")(?:\s(?:million|billion))?)(?:\s*[,;]\s*((?:" + NUMERO + r")(?:/\d+)?\s*(?:lbs?|oz)\.?|neg\.?))?")
# A unidade logo antes do preço: "Per 10 yards: $100", "per pint: $2".
UNIDADE = re.compile(r"\b([Pp]er [\w\s’'\-,]{1,25}?):\s*$")
# "(TL1)", "(TL0-4)" ou, no Basic Set, "(var.)": o TL da perícia que o item serve.
TL = re.compile(r"\s*\((?:TL\s?([\d^+\-–]+(?:\s?[–-]\s?\d+)?)|(var\.?))\)")
# Parágrafos em itálico que não são itens ("Example: ...", "Note: ...").
NAO_E_ITEM = re.compile(r"^(?:Examples?\b.*|Notes?|Design Notes?|Other Notes|Alternate SMs|TL|LC|Cost|Weight)$")
# As armas das tabelas de tesouro ("Bizarre Weapon Table", grupos "AXE/MACE (DX-5, ...)") estão em extrair_armas.py.
CATEGORIA_DE_ARMA = re.compile(r"WEAPON TABLE|\(DX-")
# Livros só com listas de kits montados com os itens dos outros livros.
LIVROS_FORA = ("Loadouts",)
# Páginas candidatas (texto rápido, pelo pypdfium2): um preço com peso.
CANDIDATA = re.compile(r"\$[\d,.]+\s*[,;]\s*(?:[\d.,/]+\s*(?:lbs?|oz)\.?|neg\.)")
# A linha de tesouro do Dungeon Fantasy 8: os dados, o nome e o preço.
TESOURO = re.compile(r"^[\d\-–]+(?:,\s*[\d\-–]+)*\s*–\s*(.+?)\.\s*(\$.*)?$")


def corpo(w):
    """Letra do texto corrido (9,2 a 9,5 pt)."""
    return 8.5 <= w["size"] <= 10.5


def eh_titulo(ln):
    """Título de seção: negrito, seminegrito (também itálico) ou Black de 10,5 a 24 pt
    ("Camping and Survival Gear", "Potions", "Cooking")."""
    return all(re.search(r"Bold|Black|SemiB", fonte(w)) and 10.5 <= w["size"] <= 24 for w in ln)


def eh_citacao(ln):
    """Citação em destaque ou legenda: itálico grande, sem negrito. Fica de fora."""
    return all(w["size"] >= 11.5 and italico(w) and not re.search(r"Bold|Black|SemiB", fonte(w)) for w in ln)


def eh_capitulo(ln):
    """Título de capítulo, em letras grandes (às vezes partido entre as colunas)."""
    return any(w["size"] > 24 for w in ln)


def nome_italico(ln):
    """O nome em itálico no começo do parágrafo ("Backpack, Frame (TL1).", "Machete:"), sem o
    ponto ou os dois-pontos; None se a linha não começa um verbete."""
    run = []
    for w in ln:
        if not italico(w) or "Bold" in fonte(w) or not corpo(w):
            break
        run.append(w)
    if not run or len(run) > 10 or not re.match(r"[A-Z0-9“\"']", run[0]["text"]):
        return None
    if not run[-1]["text"].endswith((".", ":")):
        # no Basic Set, o TL depois do nome não é itálico: "Backpack, Frame (TL1)."
        resto = ln[len(run):len(run) + 3]
        for n in range(1, len(resto) + 1):
            if re.match(r"^\([^()]*\)[.:]$", texto(resto[:n])):
                run = run + resto[:n]
                break
        else:
            return None
    if len(run) == len(ln) and len(run) > 6:
        return None  # uma frase inteira em itálico (citação, nota), não um nome
    return texto(run)[:-1].strip(), len(run)


def nome_tesouro(ln):
    """A linha de tesouro em negrito do Dungeon Fantasy 8: (nome, resto da linha) ou None."""
    if not ("Bold" in fonte(ln[0]) and not italico(ln[0]) and corpo(ln[0])):
        return None
    m = TESOURO.match(texto(ln))
    return (m.group(1).strip(), m.group(2) or "") if m else None


def preco(t):
    """(custo, peso) do primeiro preço com peso do texto, ou do primeiro preço: ("$100", "10 lbs."),
    ("$2 per pint", "1 lb."). Uma taxa antes do preço ("$20/month fee. $250, 0.25 lb.") não conta."""
    achados = list(PRECO.finditer(t))
    m = next((m for m in achados if m.group(2)), achados[0] if achados else None)
    if not m:
        return "", ""
    custo = "$" + m.group(1)
    u = UNIDADE.search(t[:m.start()])
    if u:
        custo += " " + u.group(1).lower()
    peso = (m.group(2) or "").strip()
    if peso and not peso.endswith("."):
        peso += "."
    return custo, peso


def categoria(t):
    """"FIBERS AND FABRICS TABLE" -> "Fibers and Fabrics Table"; as que não estão em maiúsculas ficam."""
    t = capitalizar(t)
    return re.sub(r"(?<=\S) (And|Of|The|Or|For|In|On|To|With|A|An)\b", lambda m: " " + m.group(1).lower(), t)


class Item:
    def __init__(self, livro, pagina, nome, categoria, tesouro):
        self.livro, self.pagina, self.categoria, self.tesouro = livro, pagina, categoria, tesouro
        m = TL.search(nome)
        self.tl = (m.group(1) or m.group(2)).replace("–", "-") if m else ""
        self.nome = TL.sub("", nome).strip(" ,")
        self.partes = []

    def finalizar(self):
        descricao = juntar(self.partes)
        custo, peso = preco(descricao)
        if not custo or NAO_E_ITEM.match(self.nome) or CATEGORIA_DE_ARMA.search(self.categoria):
            return None  # sem preço: uma remissão ("Piton. See Iron Spike, above.") ou um texto qualquer
        if self.tesouro:
            # o preço é o da linha do tesouro; o texto é a descrição
            m = PRECO.match(descricao)
            if m:
                descricao = descricao[m.end():].lstrip(" .,;")
        return {"livro": self.livro, "pagina": self.pagina, "item": self.nome, "tl": self.tl, "categoria": categoria(self.categoria),
                "custo": custo, "peso": peso, "descricao": descricao}


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
    if any(x in nome_livro for x in LIVROS_FORA):
        return
    paginas = paginas_candidatas(caminho)
    atual, categoria, anterior, pg_anterior = None, "", None, None

    def fechar():
        nonlocal atual
        linha = atual and atual.finalizar()
        if linha:
            saida.writerow(linha)
            contador[nome_livro] += 1
        atual = None

    with pdfplumber.open(caminho) as pdf:
        for i in paginas:
            if pg_anterior is not None and i != pg_anterior + 1:
                fechar()  # páginas puladas: o verbete e a seção não continuam
                categoria = ""
            page = pdf.pages[i]
            h = page.height
            todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
            rodape = sorted([w for w in todas if w["top"] >= h - 50], key=lambda w: w["x0"])
            numero = next((w["text"] for w in rodape if w["text"].isdigit()), "") or str(i + 1)
            caixas = quadros(page)
            words = [w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper()
                     and not dentro(w, caixas)]
            lns = [(ln, c) for ln, c in ler_colunas(words, page.width) if not eh_citacao(ln)]
            # margem de cada coluna: o começo de linha mais à esquerda que se repete (numa lista de
            # itens de uma ou duas linhas, os começos recuados podem ser a maioria)
            margens = {}
            for ln, coluna in lns:
                if corpo(ln[0]):
                    margens.setdefault(coluna, Counter())[round(ln[0]["x0"])] += 1
            margem = {c: min([x for x, n in m.items() if n >= 2] or m) for c, m in margens.items()}
            titulo_antes = None  # (linha, coluna) do título anterior, para o título em duas linhas
            inicio = True  # a primeira linha de texto da página pode continuar o verbete da anterior
            for ln, coluna in lns:
                recuada = ln[0]["x0"] - margem.get(coluna, ln[0]["x0"]) > 5
                if eh_capitulo(ln):
                    fechar()
                    categoria = ""
                    continue
                if eh_titulo(ln):
                    fechar()
                    if titulo_antes and titulo_antes[1] == coluna and 0 < ln[0]["bottom"] - titulo_antes[0] < 22:
                        categoria += " " + texto(ln)  # "Camping and Survival" / "Gear"
                    else:
                        categoria = texto(ln)
                    titulo_antes = (ln[0]["bottom"], coluna)
                    anterior = None
                    continue
                if not corpo(ln[0]):
                    continue
                primeira, inicio = inicio, False
                tes = nome_tesouro(ln)
                ita = None if tes else (recuada and nome_italico(ln))
                if tes or ita:
                    fechar()
                    if tes:
                        atual = Item(nome_livro, numero, tes[0], categoria, True)
                        if tes[1]:
                            atual.partes.append(tes[1])
                    else:
                        atual = Item(nome_livro, numero, ita[0], categoria, False)
                        atual.partes.append(texto(ln[ita[1]:]))
                    anterior = (ln[0]["bottom"], coluna)
                    continue
                if atual:
                    # o verbete continua na linha de baixo, no alto da coluna seguinte ou da página
                    # seguinte; um parágrafo novo só continua a descrição do tesouro
                    continua = segue(anterior, ln, coluna) or (anterior is None and primeira and not recuada)
                    if continua and (not recuada or atual.tesouro):
                        atual.partes.append(texto(ln))
                        anterior = (ln[0]["bottom"], coluna)
                        continue
                    fechar()
                anterior = (ln[0]["bottom"], coluna)
            anterior = None  # na página seguinte, só a primeira linha pode continuar o verbete
            pg_anterior = i
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
    arquivo = a.saida or (a.pasta / "itens.csv")
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
            print(f"  {contador[livro]} itens")
    print(f"\nTotal: {sum(contador.values())} itens -> {arquivo}")


if __name__ == "__main__":
    main()
