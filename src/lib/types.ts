export type Gender = "male" | "female" | "other" | "unknown";
export type ParentChildType = "biological" | "adopted" | "step";
export type SpouseStatus = "married" | "divorced" | "widowed" | "partnered";

export type PersonSummary = {
  id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  is_alive: boolean;
  has_account: boolean;
  avatar_url: string | null;
};

export type PersonParentSummary = PersonSummary & {
  relationship_id: string;
  relationship_type: ParentChildType;
};

export type PersonSpouseSummary = PersonSummary & {
  relationship_id: string;
  status: SpouseStatus;
  start_date: string | null;
  end_date: string | null;
};

export type PersonDetail = {
  id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string | null;
  date_of_death: string | null;
  is_alive: boolean;
  avatar_url: string | null;
  notes: string | null;
  has_account: boolean;
  created_by: string;
  parents: PersonParentSummary[];
  children: PersonParentSummary[];
  spouses: PersonSpouseSummary[];
  descendant_count: number;
  ancestor_count: number;
};

export type TreeNode = {
  id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  is_alive: boolean;
  has_account: boolean;
  avatar_url: string | null;
  parents_count: number;
  children_count: number;
  has_more_parents: boolean;
  has_more_children: boolean;
};

export type ParentChildEdge = {
  id: string;
  parent_id: string;
  child_id: string;
  relationship_type: ParentChildType;
};

export type SpouseEdge = {
  id: string;
  person_a_id: string;
  person_b_id: string;
  status: SpouseStatus;
  start_date: string | null;
  end_date: string | null;
};

export type TreeGraphResponse = {
  center_id: string;
  nodes: TreeNode[];
  parent_child_edges: ParentChildEdge[];
  spouse_edges: SpouseEdge[];
};

export type CurrentUser = {
  id: string;
  email: string;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    gender: Gender;
    date_of_birth: string | null;
    date_of_death: string | null;
    is_alive: boolean;
    avatar_url: string | null;
    notes: string | null;
  };
};
