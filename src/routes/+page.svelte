<svelte:head>
	<script src="https://apis.google.com/js/api.js"></script><!--There's not an official browser NPM package for the Google API-->
	<script src="https://accounts.google.com/gsi/client" async></script><!--There's not an official browser NPM package for the Google Sign In client-->
</svelte:head>
<style>
	.loader {
	margin: auto;
	border: 20px solid #EAF0F6;
	border-radius: 50%;
	border-top: 20px solid #FF7A59;
	width: 40px;
	height: 40px;
	animation: spinner 4s linear infinite;
	}

	@keyframes spinner {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
	}
</style>
<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { userState } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import {
		GoogleAuthProvider,
		signInWithPopup,
		signOut,
		type Auth} from 'firebase/auth';
	import type { PageData } from './$types';
	export let data: PageData;

	if (browser) { // Only load llama-cpp-wasm in browser because it requires a service worker
		import('../vendor/llama-st/llama').then((module) => LlamaCpp = module.LlamaCpp);
	}

	let LlamaCpp: any; // No type declaration for LlamaCpp at the moment
	let loading: boolean = true;
	let loggedIn: boolean = false;
	let auth: Auth = data.auth;
	let google_client_id: string = data.google_client_id;
	let google_docs_api_key: string = data.google_docs_api_key;
	let gapiInitialized: boolean = false;
	let gisInitialized: boolean = false;
	let authorized: boolean = false;
	let tokenClient: google.accounts.oauth2.TokenClient;
	let files: any[] = []; // Not going to worry about the Google Drive file data structure for now
	let llamaApp: any; // No type declaration for the LlamaApp at the moment
	let prompt: string = '';
	let result: string = '';
	let modelRunning: boolean = false;
	let modelStatus: string = '';

	userState.subscribe((cur: any) => {
		loading = cur?.loading;
		loggedIn = cur?.loggedIn;
	});

	onMount(async () => {
		gapi.load('client', initializeGapiClient);
		initializeGisClient();
		
		const user: any = await data.getAuthUser();

		const loggedIn = !!user && user?.emailVerified;
		userState.update((cur: any) => {
			loading = false;
			return {
				...cur,
				user,
				loggedIn,
				loading: false
			};
		});

		if (loggedIn) {
			goto('/');
		}
	});

	function initializeGisClient() {
		/**
		 * Initialize the Sign in with Google client.
		 * 
		 * @remarks
		 * 
		 * We initialize the client using an OAuth2
		 * token with scopes for reading Google Docs
		 * and Google Drive data. These scopes are
		 * required for the application to work.
		*/
		tokenClient = google.accounts.oauth2.initTokenClient({
			client_id: google_client_id,
			scope: 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
			callback: handleLogin
		})
		gisInitialized = true;
	}

	async function initializeGapiClient() {
		/**
		 * Initialize the Google API client
		 * 
		 * @remarks
		 * 
		 * We initialize the Google API client
		 * using discovery docs for Google Drive
		 * and Google Docs since those are the
		 * services we will access through the
		 * Google client.
		*/
		await gapi.client.init({
			apiKey: google_docs_api_key,
			discoveryDocs: ['https://docs.googleapis.com/$discovery/rest?version=v1', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
			});
			gapiInitialized = true;
		}

	async function handleLogin(response: google.accounts.oauth2.TokenResponse) {
		/**
		 * Callback for the Sign with Google login process
		 * 
		 * @remarks
		 * 
		 * Throw an error if there was an error in the response.
		 * If successful,update application state to note that
		 * the user is authorized to access the application.
		 * 
		 * @param response - the response from the Google
		 * authentication API
		*/
		if(response.error !== undefined) {
			throw(response);
		}
		authorized = true;
		console.debug(response);
	}

	function handleAuthClick() {
		/**
		 * Handle the button click for authorizing Google
		 * Drive access
		 * 
		 * @remarks
		 * 
		 * Trigger the Google API consent popup using the
		 * previously initialized Sign in with Google client
		 * if we do not have a client token. If we do, skip
		 * asking for consent and request an access token.
		*/
		if(gapi.client.getToken() === null) {
			tokenClient.requestAccessToken({prompt: 'consent'});
		} else {
			tokenClient.requestAccessToken({prompt: ''});
		}
	}

	function handleRevokeClick() {
		/**
		 * Handle the button click for revoking Google Drive
		 * access
		 * 
		 * @remarks
		 * 
		 * Get the current client token and revoke the token's
		 * access to Google APIs if there is a current token.
		 * Also clear the token from the client and remove
		 * authorized status.
		 */
		const token: GoogleApiOAuth2TokenObject = gapi.client.getToken();
		if(token !== null) {
			google.accounts.oauth2.revoke(token.access_token, () => {authorized = false;});
			gapi.client.setToken({access_token: ''});
		}
	}

	async function loginWithGoogle() {
		/**
		 * Handle button click for the Login with Google button
		 * 
		 * @remarks
		 * 
		 * Trigger Firebase's sign-in with Google authentication
		 * journey. This should trigger a popup for signing in
		 * with a Google account through Firebase. If the sign-in
		 * is successful, store basic user information and note
		 * the user is logged in to the application.
		 */
		const provider = new GoogleAuthProvider();
		try {
			const loginResult = await signInWithPopup(data.auth, provider);
			const { displayName, email, uid } = loginResult?.user;
				userState.set({
				loggedIn: true,
				user: {
					displayName,
					email,
					uid
				}
			});
			goto('/');
		} catch(error: any) {
			console.error(error);
			return error;
		}
	}

	async function logOut() {
		/**
		 * Handle log out button click
		 * 
		 * @remarks
		 * 
		 * Trigger the sign out journey using the
		 * Firebase SDK authentication library and
		 * clear the user state from the application.
		*/
		try {
			await signOut(auth);
			userState.update((cur: any) => {
				return {
					user: null,
					loading: false,
					loggedIn: false
				}
			});
		} catch(error: any) {
			console.error(error);
			return error;
		}
	}

	async function listFiles() {
		/**
		 * Handle the button click of the List Files button
		 * 
		 * @remarks
		 * 
		 * Retrieve Google Docs document files from
		 * Google Drive using the Google Drive API.
		 * The application will render the names of
		 * any files that are retrieved.
		 */
		let response;
		try {
			response = await gapi.client.drive.files.list({
				'pageSize': 10,
				'fields': 'files(id, name)',
				'q': "mimeType = 'application/vnd.google-apps.document'", // Have to use double quotes wrapped in single quotes because the mimeType must be wrapped in single quotes. Otherwise the call doesn't work.
			});
		} catch (error: any) {
			console.error(error.message);
			return;
		}
		files = response.result.files;
	}

	function addCurrentAndChildTabs(tab: any, allTabs: any[]): any{
		/**
		 * Recursively flatten the tabs in a Google Doc
		 * 
		 * @remarks
		 * 
		 * Google Docs structure content in tabs
		 * nested within tabs. This function
		 * unnests the tabs into a flat Array.
		 * 
		 * @param tab - A Google Docs tab
		 * @param allTabs - an Array containing all of
		 * the Google Docs tabs traversed so far
		 * @returns the allTabs Array with the current tab pushed
		 * to the end of the Array
		*/
		allTabs.push(tab);
		if(tab.childTabs !== undefined){
			for (const childTab of tab.childTabs) {
				addCurrentAndChildTabs(childTab, allTabs);
			}
		}
		return allTabs;
	}

	function readParagraphElement(element: any){
		/**
		 * Retrieve the text content of a paragraph element
		 * 
		 * @param element - the Google Docs document element
		 * @returns the text content of the element or an empty string
		 * if there is no content
		 */
		const text_run = element.textRun;
		if(text_run === undefined){
			return '';
		}
		return text_run.content;
	}

	function readStructuralElements(elements: any[]) {
		/**
		 * Retrieve the text from Google Docs document elements
		 * 
		 * @param elements - an Array of Google Docs document
		 * elements
		 * @returns the full raw text of the Google Docs elements
		 */
		let text = '';
		for (const value of elements) {
			if(value.paragraph !== undefined) {
				const paragraphElements = value.paragraph.elements
				for (const paragraphElement of paragraphElements){
					text += readParagraphElement(paragraphElement);
				}
			}
		}
		return text;
	}

	async function retrieveDocumentContents(fileId: string) {
		/**
		 * Retrieve the specified Google Docs document
		 * and retrieve all of the text from the document
		 * 
		 * @remarks
		 * This function and its related functions are adapted
		 * from an example written in Python on the Google Docs
		 * website for how to get all of the text of a document.
		 * Google Docs structures documents in complex,
		 * multi-layer objects. You have to traverse the entire
		 * document structure to get all of the text of the
		 * document.
		 * 
		 * @param fileId - the ID of the Google Docs document
		 * @returns the complete raw text of a Google Docs
		 * document
		*/
		try {
			let documentText = '';
			const response = await gapi.client.docs.documents.get({
				documentId: fileId,
				includeTabsContent: true,
			});
			const doc = response.result;
			const allTabs: any[] = [];
			if(doc.tabs !== undefined) {
				for (const tab of doc.tabs) {
					addCurrentAndChildTabs(tab, allTabs);
				}
			}
			for (const tab of allTabs){
				const documentTab = tab.documentTab;
				const tabContent = documentTab.body.content;
				const tabText = readStructuralElements(tabContent);
				documentText += tabText;
			}
			console.debug(doc)
			console.debug(documentText);
			return documentText;
		} catch (error: any) {
			console.error(error);
		}
	}

	async function generateSummary(fileId: string) {
		/**
		 * Generate a summary of the Google Doc document
		 * with the given file ID.
		 * 
		 * @remarks
		 * This function definition contains multiple
		 * nested function definitions required to
		 * instantiate the LlamaCpp application. They
		 * are not used anywhere else.
		 * 
		 * @param fileId - the ID of the Google Doc document
		 * to summarize
		 */
		const onMessageChunk = (text: string) => {
			/**
			 * Handles message chunks from llama-cpp-wasm as
			 * they are generated. Each chunk is a string.
			 * Currently, append each new chunk to the result.
			 * 
			 * @remarks
			 * 
			 * This function is a required argument when you
			 * instantiate a new LlamaCpp object.
			 * 
			 * @param text - the text chunk from llama-cpp-wasm
			*/
			console.debug(text);
			result += text;
		};

		const onComplete = () => {
			/**
			 * Perform cleanup and other tasks after the
			 * llama-cpp-wasm model has finished.
			 * 
			 * @remarks
			 * 
			 * This function is a required argument when you
			 * instantiate a new LlamaCpp object.
			*/
			console.debug('model: completed');
			modelRunning = false;
			modelStatus = 'completed';
		}

		const onModelLoaded = () => {
			/**
			 * Perform tasks after the llama-cpp-wasm model
			 * is downloaded and loaded into LlamaCpp. Start
			 * the LlamaCpp application with a prompt to
			 * summarize the selected Google Docs document.
			 * 
			 * @remarks
			 * 
			 * This function is a required argument when you
			 * instantiate a new LlamaCpp object.
			*/
			console.debug('model: loaded');
			llamaApp.run({
				prompt: prompt,
				ctx_size: 4096,
				temp: 0.1,
				no_display_prompt: true,
			});
			modelStatus = 'running';
		}

		try {
			const documentContents = await retrieveDocumentContents(fileId);
			prompt = `Summarize the following text in five sentences:\n${documentContents}`;
			
			console.debug(prompt);
			llamaApp = new LlamaCpp(
				'https://huggingface.co/stabilityai/stablelm-2-zephyr-1_6b/resolve/main/stablelm-2-zephyr-1_6b-Q4_1.gguf',
				onModelLoaded,
				onMessageChunk,
				onComplete,
			);
			modelRunning = true;
			modelStatus = 'downloading';
		} catch(error: any) {
			console.error(error);
			return;
		}
	}
</script>

<h1>Summarize Google Docs in your browser!</h1>
{#if loading}
	<p>Loading...</p>
{:else}
	{#if !loggedIn}
		<p>Get started by logging in with Google! This proof-of-concept application requires a Google account. You must login before you can summarize Google Docs.</p>
		<button on:click={loginWithGoogle}>Login with Google</button>
	{:else}
		<p>You are logged in with Google.</p>
		<button on:click={logOut}>Log out</button>
	{/if}
{/if}

{#if loggedIn}
	<div transition:fly={{ y: 200, duration: 2000}}>
	{#if gapiInitialized && gisInitialized}
		<div class="login-form">
			<h1>Google Docs</h1>
			<p>You must authorize this proof-of-concept application to have access to Google Drive and Google Docs on your behalf. This application requires read access to Google Drive and Google Docs.</p>
			<p><strong>This application will not store any of your Google Drive or Google Docs data, but you should probably use a throwaway account to test this proof-of-concept application.</strong></p>
			<button on:click={handleAuthClick}>{#if !authorized}Authorize{:else}Refresh access{/if}</button>
			{#if authorized}
			<button on:click={handleRevokeClick}>Revoke Google Drive access</button>
			{/if}
		</div>
	{/if}
	</div>
	{#if authorized}
		<div style="margin-top: 1rem;" transition:fly={{ y: 200, duration: 2000}}>
		<button on:click={listFiles}>List Files</button>
		</div>
	{/if}
	{#each files as file}
		<ul transition:fly={{ y: 200, duration: 2000}}>
			<li><button style="margin-right: 0.25rem;" on:click={generateSummary(file.id)}>Summarize</button><span>{file.name}</span></li>
		</ul>
	{/each}
{/if}
{#if modelRunning}
	{#if modelStatus == 'downloading'}
		<p>Downloading model. This can take several minutes if this is your first time running the model.</p>
	{/if}
	{#if modelStatus == 'running'}
		<p>Model running...</p>
	{/if}
	{#if result == ''}
		<div class="loader"></div>
	{/if}
{/if}
{#if result != ''}
	<div transition:fly={{ y: 200, duration: 2000}}>
		<h2>Your Google Doc Summary</h2>
		<p>{result}</p>
	</div>
{/if}