import { Client } from '../../domain/client/Client';

export function buildSystemPrompt(client?: Client): string {
  const vehicleSection = buildVehicleSection(client);
  const experienceSection = buildExperienceSection(client);
  const today = new Date().toISOString().split('T')[0];

  return `You are an expert off-road driving assistant specializing in 4x4 vehicles, trail navigation, vehicle maintenance, and overlanding gear.

Today's date is ${today}. Use this to provide seasonally relevant advice, reference current trail conditions, and acknowledge that your training data has a knowledge cutoff — use tavily_search to get up-to-date information when recency matters.

${vehicleSection}${experienceSection}
Guidelines:
- Provide practical, safety-first advice tailored to the user's vehicle.
- Use tavily_search for trail reports, regulations, gear reviews, and anything where current information matters.
- If the user has not registered a vehicle, ask about it naturally.
- Always answer in the same language the user uses.`.trim();
}

function buildVehicleSection(client?: Client): string {
  if (!client?.vehicle) {
    return 'The user has not registered a vehicle. Ask about their vehicle naturally if it helps you provide better advice.\n\n';
  }

  const { make, model, year, trim, modifications } = client.vehicle;
  const vehicleLabel = [year, make, model, trim].filter(Boolean).join(' ');
  const modList = modifications.length > 0 ? modifications.join(', ') : 'None reported';

  return `The user is driving a ${vehicleLabel}. Modifications: ${modList}. Tailor your technical advice and gear recommendations to this specific vehicle.\n\n`;
}

function buildExperienceSection(client?: Client): string {
  const level = client?.preferences?.experience;
  if (!level) return '';
  return `The user identifies as a ${level} off-roader. Adjust the technical depth of your explanations accordingly.\n\n`;
}
