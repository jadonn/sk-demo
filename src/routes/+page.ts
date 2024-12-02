/** @type { import('./$types').PageLoad } */

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { browser } from '$app/environment';

let app: FirebaseApp;
let auth: Auth;
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

function initializeFirebase() {
	/**
	 * Initialize Firebase using the API credentials defined
	 * in the .env file in src/ and get an authentication
	 * object from the Firebase SDK.
	 */
	try{
		if (!app) {
			app = initializeApp(firebaseConfig);
			auth = getAuth(app);
		}
	} catch (error) {
		console.error(error);
	}
}

export async function load({ url }) {
	/**
	 * This function is broadly used for loading API keys
	 * and other secrets from an environment file so
	 * that the secrets do not have to be committed
	 * into code somewhere.
	 */
	if (browser) {
		initializeFirebase();
	}

	function getAuthUser() {
		return new Promise(( resolve ) => {
			onAuthStateChanged(auth, ( user ) => resolve(user ? user : false));
		});
	}

	return {
		auth: auth,
		google_client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
		google_docs_api_key: import.meta.env.VITE_GOOGLE_DOCS_API_KEY,
		getAuthUser: getAuthUser,
		url: url.pathname
	}
}