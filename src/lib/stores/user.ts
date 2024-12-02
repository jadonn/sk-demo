import { writable, type Writable } from 'svelte/store';
type User = {
	displayName?: string | null;
	email?: string | null;
	uid?: string | null;
}

export type UserState = {
	user: User | null;
	loading?: boolean;
	loggedIn? : boolean;
};

export const userState = <Writable<UserState>>writable();