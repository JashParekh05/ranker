// Domain model for GC Rankings.

export type Person = {
  id: string;
  name: string;
  /** optional emoji or short tag shown on the node */
  tag?: string;
};

export type GroupChat = {
  id: string;
  name: string;
  /** short human-typeable join code, e.g. "K7P2QX" */
  code: string;
  createdAt: number;
  people: Person[];
};

export type Ranking = {
  id: string;
  gcId: string;
  title: string; // e.g. "Performativeness", "Funniest"
  /** ordered list of person ids, index 0 = rank 1 (top) */
  order: string[];
  /** display name of the person who created this ranking */
  author: string;
  createdAt: number;
  updatedAt: number;
};

export type RevisionStatus = "pending" | "approved" | "rejected";

export type Revision = {
  id: string;
  rankingId: string;
  gcId: string;
  /** display name of the proposer */
  proposedBy: string;
  /** proposed ordered list of person ids */
  order: string[];
  status: RevisionStatus;
  createdAt: number;
  resolvedAt?: number;
};

export type AppData = {
  groupChats: GroupChat[];
  rankings: Ranking[];
  revisions: Revision[];
};
