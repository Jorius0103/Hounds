# Banco de dados no Firebase

Com o Firebase configurado, o site no GitHub Pages guarda tudo num banco compartilhado: mapas, locais, personagens, anotações, usuários, imagens e a Mesa de Combate. Todos veem as mesmas informações, e as mudanças aparecem na hora para quem estiver com o site aberto.

Usa só o **Cloud Firestore**, no plano gratuito (Spark), sem cartão de crédito. As imagens também ficam no Firestore, divididas em pedaços, porque o Cloud Storage do Firebase exige o plano pago (Blaze).

O acesso é protegido por uma **senha da campanha**: uma única conta do Firebase que o grupo todo usa. Cada pessoa digita a senha uma vez por navegador.

## 1. Criar o projeto

1. Entre em https://console.firebase.google.com e crie um projeto (por exemplo, `hounds`). O Google Analytics pode ficar desativado.
2. Na página inicial do projeto, clique no ícone **Web** (`</>`) para registrar um app. Dê o apelido `Hounds` e **não** marque o Firebase Hosting.
3. O Firebase mostra um bloco `const firebaseConfig = { ... }`. Copie os valores para os campos de mesmo nome em [firebase-config.js](firebase-config.js).

## 2. Criar o banco

1. No menu, abra **Firestore Database** e clique em **Criar banco de dados**.
2. Escolha o local `southamerica-east1 (São Paulo)`. Não dá para mudar depois.
3. Comece no **modo de produção**.
4. Na aba **Regras**, apague o conteúdo e cole o de [firestore.rules](firestore.rules), trocando `EMAIL-DA-CAMPANHA` pelo e-mail que você vai criar no passo 3. Clique em **Publicar**.

## 3. Criar a senha da campanha

1. No menu, abra **Authentication** e clique em **Vamos começar**.
2. Em **Método de login**, ative **E-mail/senha** (só a primeira chave) e salve.
3. Em **Usuários**, clique em **Adicionar usuário**. Use um e-mail para a campanha, por exemplo `campanha@hounds.app` (não precisa ser uma caixa de e-mail real), e a senha que o grupo vai digitar.
4. Em **Configurações > Ações do usuário**, desmarque a criação de contas (inscrição), para ninguém criar contas novas. As regras já recusam qualquer outra conta, mas assim fica fechado também na entrada.
5. Em [firebase-config.js](firebase-config.js), preencha `campaignEmail` com o mesmo e-mail.

## 4. Importar os dados atuais

Os JSON e as imagens deste repositório podem ser copiados para o banco. É preciso ter o [Node.js](https://nodejs.org) instalado. Na pasta do projeto:

```
cd tools
npm install
node importar-dados.mjs
```

O script pede a senha da campanha e mostra o que importou. Se o banco já tiver dados, ele para sem mexer em nada. Para importar por cima, use `node importar-dados.mjs --sobrescrever`.

## 5. Publicar

Faça commit e push de `firebase-config.js`. O GitHub Pages atualiza em cerca de um minuto. Ao abrir o site, aparece a tela da senha e, depois dela, a escolha de usuário de sempre.

Os valores de `firebase-config.js` não são secretos e podem ficar no repositório público. Quem protege os dados é a senha e as regras do passo 2.

## No dia a dia

- **Trocar a senha:** o console do Firebase não edita a senha direto. Em **Authentication > Usuários**, exclua a conta e crie de novo com o mesmo e-mail e a senha nova. Em até uma hora, todos precisam digitar a senha nova.
- **Limites do plano gratuito:** 1 GiB guardado, 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia. Uma campanha fica bem abaixo disso. Cada navegador baixa uma imagem só uma vez e depois a guarda.
- **Voltar ao modo só navegador:** deixe `apiKey` vazio em `firebase-config.js`.

## Depois de importar

Os arquivos `*.json` e as imagens na raiz do repositório continuam públicos no GitHub Pages, sem senha. Por exemplo, qualquer pessoa abre `https://jorius0103.github.io/Hounds/notes.json`. Depois de importar, considere apagá-los do repositório. Eles continuam no histórico do git.
