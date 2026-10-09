# Hounds — Hub da campanha GURPS

Exportação completa do projeto: o código do hub e uma cópia dos dados da campanha.

## Pastas

| Caminho | O que é |
|---|---|
| `index.html` | O hub completo num arquivo só (menu, Informações, Anotações, Usuários e a Mesa de Combate embutida). |
| `mesa.html` | A Mesa de Combate (Dash RPG) compilada, separada, para consulta. |
| `*.json` | Cópia dos dados salvos no site, em JSON. |
| `*.jpg`, `*.png` | As imagens enviadas (mapas, locais, personagens). O nome do arquivo é o `ref` usado nos dados. |
| `supabase-config.js` | Configuração do banco de dados (Supabase). Veja [SUPABASE.md](SUPABASE.md). |
| `firebase-config.js` | Configuração do banco de dados (Firebase). Veja [FIREBASE.md](FIREBASE.md). |
| `firestore.rules` | Regras de acesso do banco: só a conta da campanha lê e grava. |
| `tools/` | Scripts que importam os JSON e as imagens para o Supabase ou Firebase. |

### Arquivos de dados

- `maps.json`: mapas, com hierarquia (`parentId`), imagem (`image.ref`) e visibilidade (`visible`).
- `locations.json`: locais.
- `characters.json`: personagens de Informações.
- `notebooks.json` e `notes.json`: títulos e anotações.
- `users.json`: usuários e perfis (mestre, jogador, visualizador = Espectador).
- `mesa-de-combate.json`: estado completo da Mesa (combates, NPCs, personagens salvos, condições, rounds e log).

Cada arquivo é um objeto `{ id: documento }`.

## Onde roda

O site fica no GitHub Pages: https://jorius0103.github.io/Hounds/. A página escolhe onde guardar os dados, nesta ordem:

1. **Artifact do claude.ai:** usa o banco de dados e o armazenamento de imagens da plataforma.
2. **Supabase:** quando `supabase-config.js` está preenchido. Dados em tempo real (PostgreSQL + Realtime + Storage). Configuração em [SUPABASE.md](SUPABASE.md).
3. **Firebase:** quando `firebase-config.js` está preenchido. Todos veem os mesmos dados, em tempo real, e o grupo entra com a senha da campanha. Configuração em [FIREBASE.md](FIREBASE.md).
4. **Só o navegador:** sem nenhum dos dois, a página funciona, mas os dados ficam só no navegador de quem usa e começam vazios.

Os arquivos JSON não são carregados automaticamente. Para levá-los ao Supabase, use `tools/importar-supabase.mjs`.

## Funcionalidades

- **Usuários:** escolha de usuário ao abrir, com perfis Mestre (administrador de tudo), Jogador e Espectador. Só o Mestre gerencia os usuários.
- **Visibilidade:** cada item tem a opção "Visível para todos". Desmarcado, só o Mestre vê.
- **Informações:** mapas em hierarquia com marcadores, localizações e personagens.
- **Anotações:** títulos com vários arquivos de anotação.
- **Tema claro e escuro:** botão no rodapé do menu. A escolha fica salva em cada navegador. Sem escolha, o site segue o tema do sistema. A Mesa de Combate acompanha.
- **Mesa de Combate:**
  - Escolha ou criação de jogo ao entrar.
  - Personagens salvos e reutilizáveis entre jogos.
  - Botões de copiar e remover que agem no combate atual.
  - Botões "Finalizar Ação" e "Finalizar Round".
  - Log de Combate com manobra, PV, FP e condições, navegação por rounds e exclusão de round.
  - Botão de sair, que salva e volta à escolha de jogo.

## Segurança

Com o Firebase, só quem sabe a senha da campanha lê ou altera os dados. Dentro do site, porém, quem entrou escolhe qualquer usuário, inclusive o Mestre. "Só o Mestre" esconde itens da tela, mas eles ainda são enviados ao navegador. Não guarde nada sigiloso.

Os arquivos JSON e as imagens deste repositório ficam públicos no GitHub Pages, sem senha.
