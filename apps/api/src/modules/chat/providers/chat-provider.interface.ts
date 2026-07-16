export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  reply: string;
  provider: 'claude' | 'faq';
}

/** Kontrak penyedia jawaban chat — Claude (AI) atau FAQ (rule-based). */
export interface ChatProviderStrategy {
  answer(history: ChatTurn[], message: string): Promise<ChatReply>;
}
