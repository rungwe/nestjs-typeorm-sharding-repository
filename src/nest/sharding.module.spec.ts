import { Test, TestingModule } from '@nestjs/testing';
import { ShardingModule } from './sharding.module';
import { ShardingManager } from '../sharding-manager';
import { ShardingType } from '../types/typeorm-sharding.type';
import { Case4 } from '../test/entity/case4';
import { RepositoryService } from '../repository-service/repository-service';

describe('ShardingModule', () => {
  let module: TestingModule;
  let shardingManager: ShardingManager;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ShardingModule.forRoot({
        shardingType: ShardingType.LIST,
        type: 'sqlite',
        synchronize: true,
        logging: 'all',
        entities: [Case4],
        shards: [
          { database: ':memory:', key: 'default', default: true },
          { database: ':memory:', key: 'partner1' },
          { database: ':memory:', key: 'partner2' },
          { database: ':memory:', key: 'partner3' },
        ],
      })],
    }).compile();

    shardingManager = module.get<ShardingManager>(ShardingManager);
    console.log(shardingManager)
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should initialize ShardingManager with provided options', async () => {
    const repository = RepositoryService.of(Case4);
    const partner = 'test';
    const entity = await repository
      .create({
        id: 1,
        firstName: 'Typeorm',
        lastName: 'Sharding',
        age: 10,
        partner
      })
      .save();

    expect(shardingManager).toBeDefined();
    expect(shardingManager.dataSources.length).toBe(4)
  });

  // Write more tests to cover other aspects of the module
});
