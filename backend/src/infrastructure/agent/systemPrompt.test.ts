import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './systemPrompt';
import { Client } from '../../domain/client/Client';

function makeClient(overrides: Partial<ConstructorParameters<typeof Client>[0]> = {}): Client {
  return new Client({
    uid: 'uid-1',
    username: 'testuser',
    displayName: 'Test User',
    pinHash: 'hash',
    vehicle: {
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2020,
      trim: 'GX',
      modifications: ['Lift kit', 'All-terrain tires'],
    },
    preferences: {
      terrainTypes: ['rock', 'mud'],
      experience: 'intermediate',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('buildSystemPrompt', () => {
  it('returns a generic prompt for anonymous users', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('expert off-road driving assistant');
    expect(prompt).toContain('Ask about their vehicle');
    expect(prompt).not.toContain('The user is driving');
    expect(prompt).not.toContain('identifies as');
  });

  it('injects vehicle details for authenticated users', () => {
    const client = makeClient();
    const prompt = buildSystemPrompt(client);
    expect(prompt).toContain('2020');
    expect(prompt).toContain('Toyota');
    expect(prompt).toContain('Land Cruiser');
    expect(prompt).toContain('GX');
    expect(prompt).toContain('Lift kit');
    expect(prompt).toContain('All-terrain tires');
  });

  it('injects experience level for authenticated users', () => {
    const client = makeClient();
    const prompt = buildSystemPrompt(client);
    expect(prompt).toContain('intermediate');
    expect(prompt).toContain('identifies as');
  });

  it('handles vehicle with no modifications', () => {
    const client = makeClient({
      vehicle: {
        make: 'Jeep',
        model: 'Wrangler',
        year: 2019,
        modifications: [],
      },
    });
    const prompt = buildSystemPrompt(client);
    expect(prompt).toContain('Jeep');
    expect(prompt).toContain('Wrangler');
    expect(prompt).toContain('None reported');
  });

  it('handles vehicle without trim', () => {
    const client = makeClient({
      vehicle: {
        make: 'Ford',
        model: 'Bronco',
        year: 2022,
        modifications: ['Roof rack'],
      },
    });
    const prompt = buildSystemPrompt(client);
    expect(prompt).toContain('Ford Bronco');
    expect(prompt).not.toMatch(/\bundefined\b/);
  });

  it('includes tavily_search instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('tavily_search');
  });

  it('includes language-mirroring instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('same language');
  });
});
