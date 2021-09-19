import {
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
export abstract class AbstractTypeEntity {
  static __delete_table__?: string;
  static __table_name__?: string;
  @PrimaryGeneratedColumn()
  id: number;
  @Column({
    type: 'int',
    default: 0,
  })
  ctime: number;
  @Column({
    type: 'int',
    default: 0,
  })
  mtime: number;
  @Column({
    type: 'int',
    default: 0,
  })
  dtime: number;
  @BeforeInsert()
  initCtimeAndMtime() {
    this.ctime = ~~(+new Date() / 1000);
    this.mtime = ~~(+new Date() / 1000);
  }
  @BeforeUpdate()
  updateMtime() {
    this.mtime = ~~(+new Date() / 1000);
  }
}