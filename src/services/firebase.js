import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDGolxlZNoEzk7z46ZMtSk9YsP32MlH45Q",
  authDomain: "llm-hyper-audio.firebaseapp.com",
  projectId: "llm-hyper-audio",
  storageBucket: "llm-hyper-audio.firebasestorage.app",
  messagingSenderId: "530304773274",
  appId: "1:530304773274:web:1764f58974d6c2fd060323",
  measurementId: "G-HFEKE65YC6"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
