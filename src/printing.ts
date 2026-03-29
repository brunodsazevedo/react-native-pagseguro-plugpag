export const PrintQuality = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  MAX: 4,
} as const;

export type PrintQualityValue =
  (typeof PrintQuality)[keyof typeof PrintQuality];

export interface PrintRequest {
  filePath: string;
  printerQuality?: number;
  steps?: number;
}

export interface PrintResult {
  result: 'ok';
  steps: number;
}

export const MIN_PRINTER_STEPS = 70;
