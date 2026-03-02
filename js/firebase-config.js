const firebaseConfig = {
  apiKey: "AIzaSyCeSDD55eyOC36dx96D_Lgu1jhS4At1E5E",
  authDomain: "botinesfv-79c52.firebaseapp.com",
  projectId: "botinesfv-79c52",
  messagingSenderId: "279134420965",
  appId: "1:279134420965:web:c23ba1742978e4f33b790c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// Storage: ya no se usa — las imágenes se suben a Hostinger via upload.php
