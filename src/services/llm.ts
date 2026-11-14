import storage from './storage';
import { api } from './api';

export async function generateStudyMaterials(content: string, selectedOutputs: string[]) {
  return api.generate(content, selectedOutputs, storage.getSettings());
}
