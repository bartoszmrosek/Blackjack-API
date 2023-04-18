import {
  Column, Entity, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
class User {
    @PrimaryGeneratedColumn()
      id: number;

    @Column({ unique: true })
      username: string;

    @Column()
      password: string;

    @Column({ default: 1000 })
      balance: number;
}

export default User;
