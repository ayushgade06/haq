import type { ExtractedFacts } from "@/lib/schema";
import arjun from "./arjun-refund.json";
import fraud from "./card-fraud.json";
import kavya from "./kavya-claim.json";
import { SAMPLE_STORIES, type SampleId } from "./stories";
import sunita from "./sunita-upi.json";

export type SampleData = {
  id: SampleId;
  asOf: string;
  facts: ExtractedFacts;
  dropped: number;
  drafts: Record<string, { en?: string; hi?: string }>;
};

const DATA = { "sunita-upi": sunita, "arjun-refund": arjun, "kavya-claim": kavya, "card-fraud": fraud } as unknown as Record<SampleId, SampleData>;

export const SAMPLES = SAMPLE_STORIES.map((s) => ({ ...s, data: DATA[s.id] }));
export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);
