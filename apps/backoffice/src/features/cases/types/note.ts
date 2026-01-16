export interface Note {
  noteId: string;
  caseId: string;
  content: string;
  author: {
    userId: string;
    userName: string;
    role: string;
  };
  timestamp: string;
}

export interface AddNoteRequest {
  content: string;
}

export interface AddNoteResponse {
  data: Note;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface GetNotesResponse {
  data: Note[];
  meta: {
    requestId: string;
    timestamp: string;
    count: number;
  };
}
