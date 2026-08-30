export type BillingRow = {
  clientNameRaw: string;
  key: string;
  retainerStart: Date | null;
  retainerEnd: Date | null;
  monthlyValue: number | null;
  monthlyValueRaw: string;
};

export type ProjectRow = {
  clientNameRaw: string;
  key: string;
  scope: string;
  lastDelivery: Date | null;
  lastDeliveryRaw: string;
  accountLead: string;
};

export type BucketId = "unknown" | "overdue" | "next7" | "next45" | "later";
export type MatchType = "exact" | "fuzzy" | "none";

export type ClientGroup = {
  key: string;
  active: BillingRow;
  history: BillingRow[];
  project: ProjectRow | null;
  matchType: MatchType;
  daysRemaining: number | null;
  bucket: BucketId;
};

export type ReviewItem = {
  billingName: string;
  projectName: string;
  score: number;
};

export type RadarResult = {
  buckets: Record<BucketId, ClientGroup[]>;
  needsReview: ReviewItem[];
  counts: { within45: number; unknown: number; needsReview: number };
};
