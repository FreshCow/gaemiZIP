export interface BoardPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface BoardCreateDto {
  title: string;
  content: string;
  author: string;
  password: string;
}
