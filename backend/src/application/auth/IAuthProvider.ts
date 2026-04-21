export interface CreateUserResult {
  uid: string;
}

export interface IAuthProvider {
  createUser(displayName: string): Promise<CreateUserResult>;
  createCustomToken(uid: string): Promise<string>;
}
