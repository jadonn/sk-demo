# Summarize your Google Docs in your browser

This project is a simple web application for generating text summaries of your Google Docs documents locally from within your browser using a Large Language Model (LLM). This is a proof-of-concept demonstration I used to explore integrating Firebase, Google Drive, Google Docs, LLaMa, and SvelteKit.

## Why write this application?

I have used Google Docs more or less since Google Docs was invented. During those many years I have accumulated a great deal of Google Docs on a wide range of topics, and I simply do not remember what all of them are about. I know many of the documents have valuable information I would like to use today in both my professional life and my personal life, but searching and manually reading the documents is too time-consuming. I developed this application to meet this need through providing a way to quickly summarize multiple Google Docs documents to save me the trouble of opening and skimming the documents myself.

In addition, I developed this application to demonstrate and to expand my capabilities with Firebase, Google Workspace, LLMs, and SvelteKit.

## How do I use the application?

1. Click on the "Login with Google" button to login with a Google account.
2. Click on the "Authorize" button to authorize the application to access Google Drive and Google Docs. **You may see a warning about the application being unverified. That is normal. You can click through the warning by clicking on the link with the text "Advanced" and then clicking on the link "Go to jadonn-sk-demo (unsafe)".** Normally clicking on an unverified application is dangerous. Only do this if you trust the application.
3. Click on the "List Files" button to retrieve a list of Google Docs from Google Drive.
4. Click on the "Summarize" button next to a Google Docs document title to start the summarizing process

After you click the "Summarize" button for the first time, the application will download an LLM from Hugging Face. The LLM is around 1GB in size and can take a few minutes to download depending on your Internet connection. After the download finishes, the application will start summarizing your document. This process can also take a few minutes. The text of the summary stream to the page as it is generated.

## How do you run this application on your own?

This application requires the following information to run:

1. Firebase API keys
2. Google API keys
3. Google Workspace/Google Drive account
4. Internet access for downloading a public LLM from Hugging Face
5. Node.js v22.8.0 or newer

The API keys for Firebase and Google are defined in an environment file called `.env` in the top level of the repo. The `.env.example` file contains a list of the keys the application requires.

Firebase has [documentation on how to create API keys on their website](https://firebase.google.com/docs/projects/api-keys). Creating a project and Firebase keys is beyond the scope of this README.

Google has [documentation on how to create the necessary API keys for Google Workspace in this quick start guide for Google docs](https://developers.google.com/docs/api/quickstart/js). Creating and configuring a project and API keys with Google is beyond the scope of this README. **You must ensure your Google API key has access privilege for Google Docs and Google Drive APIs. You must also ensure the URL you run the application at (such as http://localhost:5173) is in the list of allowed websites if you restrict website usage.**

If you have the required API keys, you should be able to run the application by using `npm install` to install all of the dependencies and then run `npm run dev` to start the application using SvelteKit's development server.

## Available features and technologies used

At its core, the application is a SvelteKit application using SvelteKit 2 and Svelte 4.

The application uses Firebase for overall authentication to access the application using [Firebase's Login with Google authentication method](https://firebase.google.com/docs/auth/web/google-signin) using the Firebase JavaScript SDK for the web. Users must login with Google through Firebase before they can use the application to summarize their Google Docs.

The application uses [Google's Sign in with Google for Web client](https://developers.google.com/identity/gsi/web/guides/client-library) to manage authorizing access to the Google Drive and Google Docs APIs and uses [Google's JavaScript API client library](https://github.com/google/google-api-javascript-client) for retrieving data from Google Drive and Google Docs.

For generating summaries of Google Docs documents, the application uses [llama-cpp-wasm](https://llama-cpp-wasm.tangledgroup.com) from [the Tangled Group](https://tangledgroup.com). llama-cpp-wasm is a WebAssembly (Wasm) build and bindings for [llama.cpp](https://github.com/ggerganov/llama.cpp). llama.cpp is an implementation of [Meta's LLaMa model](https://arxiv.org/abs/2302.13971) in C and C++ for use on edge devices instead of relying on centralized cloud-based models. llama-cpp-wasm enables running LLMs directly inside of the browser. llama-cpp-wasm uses service workers to download and to run models in the browser. To use llama-cpp-wasm, you must build the library from its project and include the JavaScript in your web page like any other JavaScript file. I used the single-threaded build of llama-cpp-wasm. I placed the built library files in the `src/vendor` folder because Vite will not include the files outside of the `src` folder.

The application uses [the StableLM 2 Zephyr 1.6B model](https://huggingface.co/stabilityai/stablelm-2-zephyr-1_6b) from [Stability AI](https://stability.ai/). This model was one of the examples the llama-cpp-wasm project used. I continued using this model because the model has good enough performance to verify the proof-of-concept works as expected and is smaller than many other models.

## What was developing the application like

I started with considering the available features and common use cases of Firebase, Google Workspace, and LLMs in order to find a combination of features that would helpfully solve some problem or provide an interesting result. At the time I was working heavily in Google Docs, and I realized summarizing Google Docs would provide a problem that could neatly benefit from the features of Firebase, Google Workspace, and LLMs.

While I was researching LLMs, I came across the llama-cpp-wasm project, and I thought trying to run models in the browser locally would provide an additional challenge and would make a more interesting application than outsourcing the model work to some external API. I know I could have simplified the application through making basic API calls to someone else, but I have always enjoyed pushing the boundaries of what is possible in the web browser as a platform as much as possible.

Once I had an idea of what I wanted to do, I worked on producing a rough proof-of-concept that provided all of the core functionality I required for the application. I usually build a simplified solution for the problem first to develop my mental model of the problem, to identify unexpected issues before I have committed too much time and effort to the approach, and to test out assumptions I have made about the problem situation. I believe you can largely solve a problem with a simple proof-of-concept, and if the proof-of-concept works well enough you can refine and expand from the proof-of-concept to provide a better experience and solution. I produced a version of the application that could handle at a basic level the Firebase authentication, the Google Workspace authorization, and summarizing a single Google Document using llama-cpp-wasm. After I had those pieces in place, I worked on refactoring the code, improving the interface, and broadly refining the application as much I could within the time I had remaining for working on the application.

### What was most challenging about the application

I feel the greatest challenge I had in the application was cleanly integrating the external JavaScript libraries, clients, and applications without NPM packages into SvelteKit. I required a few implementations, for example, to integrate llama-cpp-wasm into my SvelteKit application in a way that allowed me to properly run llama.cpp from within the browser and that allowed llama-cpp-wasm to register service workers and execute its code. I believe much of that challenge came from unfamiliarity with llama-cpp-wasm, though, and from relying on libraries that were not specifically optimized for NPM or SvelteKit.

## What would I change if I had more time

I had limited time to work on this application. There are several improvements I did not have time to implement.

The first improvement I would make to the application is paginating the Google Docs results from the Google Drive API. In its current form, the application will only retrieve a fixed count (10) of documents using Google Drive. While pagination is straightforward to add, I felt it was not necessary for demonstrating the core functionality of this proof-of-concept.

The next major improvement I would make is creating a nicer, more refined user interface. I kept the interface pared down and simplified because I focused more of my time designing and writing the application. What limited time I had for improving the interface I spent on what would benefit the user experience the most for the smallest amount of effort.

The third major improvement I would make is providing a way to store or cache the summaries either in the user's browser or in Firebase's storage service. This would save the user from having to generate new summaries for already-summarized documents.

In addition, I would work on improving the quality of the summaries the application generated. I did not evaluate models at any length because one of the models llama-cpp-wasm used in their examples was good enough to demonstrate the proof-of-concept's functionality. There are probably models that can provide better summaries or that have smaller download sizes.

I would also work on improving the type declarations and adherence to TypeScript's expectations for the external libraries. I included type declarations for Google's clients, but llama-cpp-wasm does not appear to have type declarations.