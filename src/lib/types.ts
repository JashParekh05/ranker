// Domain model for GC Rankings.

export type Person = {
  id: string;
  name: string;
  /** optional emoji or short tag shown on the node */
  tag?: string;
  /** anonymous device token that has claimed "this is me" for this person */
  claimedBy?: string | null;
};

export type GroupChat = {
  id: string;
  name: string;
  /** short human-typeable join code, e.g. "K7P2QX" */
  code: string;
  createdAt: number;
  people: Person[];
  /** device token of the group creator/admin. Only they can delete rankings. */
  adminDevice?: string | null;
};

export type RankingKind = "category" | "personal";

export type Ranking = {
  id: string;
  gcId: string;
  title: string; // e.g. "Performativeness", "Funniest", or a personal prompt
  /** ordered list of person ids, index 0 = rank 1 (top) */
  order: string[];
  /** the order before the most recent edit, for movement arrows */
  prevOrder?: string[];
  /** display name of the person who created this ranking */
  author: string;
  /**
   * "category" (default): one author ranks the roster for a trait.
   * "personal": part of an "everyone ranks everyone" set. A row with
   *   rater=null is the prompt marker; rows with rater set are ballots.
   */
  kind: RankingKind;
  /** for personal ballots: the display name of the rater who submitted it */
  rater?: string | null;
  /** "open" = anyone can edit; "approval" = only author edits, others suggest */
  editMode?: "open" | "approval";
  /** display name of whoever last edited the order */
  editedBy?: string | null;
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

/**
 * A committed past version of a ranking's order. One row is written every time
 * the order changes (a live edit or an approved suggestion), building a full
 * timeline of who reordered the list and when.
 */
export type Snapshot = {
  id: string;
  rankingId: string;
  gcId: string;
  /** the order as it stood at this point in time */
  order: string[];
  /** display name of whoever made this edit */
  editedBy?: string | null;
  createdAt: number;
};

export type AppData = {
  groupChats: GroupChat[];
  rankings: Ranking[];
  revisions: Revision[];
  /** present in the local backend; the shared backend loads these on demand */
  snapshots?: Snapshot[];
};
