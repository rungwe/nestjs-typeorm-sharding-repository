import { Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ShardingEntity } from '../../sharding-data-source.decorator';
import { ShardingType } from '../../types/typeorm-sharding.type';
import { ShardingBaseEntity } from '../../sharding-base-entity';

@ShardingEntity<Case4, string>({
    type: ShardingType.LIST,
    findShard: (entity: Case4, shardingKey: string) => !!entity.partner && shardingKey === entity.partner,
})
export class Case4 extends ShardingBaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    @Index()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    age!: number;

    @Column()
    partner!: string;
}
