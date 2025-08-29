import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  source: string;

  @Column()
  originalText: string;

  @Column()
  preprocessedText: string;

  @Column('simple-json')
  aiResult: any;

  @CreateDateColumn()
  createdAt: Date;
}
