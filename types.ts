
export interface Location {
  id: string;
  name: string;
  description: string;
  x: number; // percentage from left
  y: number; // percentage from top
  type: 'city' | 'forest' | 'ruins' | 'landmark' | 'secret';
}

export type PinType = '퀘' | '도' | '토' | '달' | '아' | '퍼' | '새' | '감' | '기' | '추' | '회' | '망' | '생' | '태' | '순' | '활';

export interface CustomPin {
  id: string;
  type: PinType;
  comment: string;
  x: number; // percentage
  y: number; // percentage
  createdAt: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
