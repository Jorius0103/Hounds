// Banco de dados (Firebase) do Hounds. Passo a passo em FIREBASE.md.
//
// Com apiKey vazio, o site continua salvando só no navegador de cada pessoa.
// Estes valores não são secretos: quem protege os dados é a senha da
// campanha e as regras de firestore.rules.
window.HOUNDS_FIREBASE = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',

  // E-mail da conta da campanha (Authentication > Usuários no Firebase).
  campaignEmail: ''
};
