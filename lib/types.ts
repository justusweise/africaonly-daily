export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  publishedAt: string;
}

export interface VideoStore {
  updatedAt: string;
  videos: Video[];
}
