export interface ProgressItem {
  mangaId: number;
  chapterId: string;
  chapterNum: string | null;
  page: number;
  pages: number;
  title: string;
  cover: string;
  updatedAt: number;
}

export type LibraryStatus = "reading" | "plan" | "completed" | "favorite";

export interface LibraryItem {
  mangaId: number;
  status: LibraryStatus;
  title: string;
  cover: string;
  addedAt: number;
}
