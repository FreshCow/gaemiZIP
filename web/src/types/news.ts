export interface NewsItem {
  id: number;
  title: string;
  link: string;
  publisher: string;
  publishDate: string;
  content: string;
}

export interface ThemeStock {
  stockCode: string;
  stockName: string;
  changeRate: string;
}

export interface KeywordGroup {
  keyword: string;
  stocks: ThemeStock[];
}

export interface AiThemeResponse {
  keywords: KeywordGroup[];
}
