/** Feature flags. Paid features are hooks only and stay off in this build. */
export const features = {
  batchExport: false,
  sync: false,
} as const;

export type FeatureName = keyof typeof features;
export const isEnabled = (f: FeatureName): boolean => features[f];
