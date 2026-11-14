export interface StudyData {
  data: Record<string, any> | null;
  rawText?: string;
  sourceType: string;
  sourceRef?: string;
  title: string;
  selectedOutputs: string[];
  parseError?: boolean;
}

export interface NavigationWarning {
  warning?: string;
}

export type NavigateData = StudyData | NavigationWarning;
