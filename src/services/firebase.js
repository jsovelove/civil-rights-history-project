import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'

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
export const storage = getStorage(app)

/**
 * Get download URL for a file in Firebase Storage
 * @param {string} path - The path to the file in Firebase Storage
 * @returns {Promise<string>} - The download URL
 */
export const getStorageImageUrl = async (path) => {
  try {
    const imageRef = ref(storage, path)
    const url = await getDownloadURL(imageRef)
    return url
  } catch (error) {
    console.error('Error getting image URL from Firebase Storage:', error)
    throw error
  }
}
