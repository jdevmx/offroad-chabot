export interface CreateUserResult {
  uid: string;
}

export interface IAuthProvider {
  createUser(displayName: string): Promise<CreateUserResult>;
  createToken(uid: string): Promise<string>;
}
