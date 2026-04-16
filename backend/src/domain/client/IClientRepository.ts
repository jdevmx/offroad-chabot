import { Client } from './Client';

export interface IClientRepository {
  findByUid(uid: string): Promise<Client | null>;
  findByUsername(username: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
}
