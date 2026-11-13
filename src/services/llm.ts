import storage from './storage';
import { fetchWithAuth } from './api';

export async function generateStudyMaterials(content: string, selectedOutputs: string[]) {
  return fetchWithAuth('/generate', {
    method: 'POST',
    body: JSON.stringify({ content, selectedOutputs, settings: storage.getSettings() }),
  });
}
