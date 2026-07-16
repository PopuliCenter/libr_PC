import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ChatRole = 'user' | 'assistant';
export type ChatProvider = 'claude' | 'faq';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  sessionId: string;

  /** Null untuk pengunjung tanpa login. */
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar' })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar' })
  provider: ChatProvider;

  @CreateDateColumn()
  createdAt: Date;
}
