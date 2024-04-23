import { Module } from '@nestjs/common';
import { Case4 } from '../entity/case4';
import { ShardingType } from '../../types/typeorm-sharding.type';
import { ShardingModule } from '../../nest/sharding.module';

@Module({
  imports: [
    ShardingModule.forRoot({
      shardingType: ShardingType.LIST,
      type: 'sqlite',
      synchronize: true,
      logging: 'all',
      entities: [Case4],
      shards: [
        { database: ':memory:', key: 'default', default: true },
        { database: ':memory:', key: 'partner1' },
        { database: ':memory:', key: 'partner2' },
        { database: ':memory:', key: 'partner3' }      
      ],
    }),
    ShardingModule.forFeature([Case4])
  ],
})
export class TestAppModule {}
