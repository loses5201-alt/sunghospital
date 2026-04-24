import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCVzKxsbUW4zDeCOOUjSlZqYNjb0zn7VfU',
  authDomain: 'sunghospital-9eb65.firebaseapp.com',
  databaseURL: 'https://sunghospital-9eb65-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'sunghospital-9eb65',
  storageBucket: 'sunghospital-9eb65.firebasestorage.app',
  messagingSenderId: '1019796894908',
  appId: '1:1019796894908:web:7bb5aad634f90974a80cb9',
}

export const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)
