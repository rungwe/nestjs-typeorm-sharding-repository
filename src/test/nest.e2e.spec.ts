import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestAppModule } from './module/test-sharding.module';
import { CaseService } from './service/case-service';
import { Case4 } from './entity/case4';
import { ShardingRepositoryService } from '../repository-service/sharding-repository-service';
import { ShardingManager } from '../sharding-manager';


describe('E2E Tests for ShardingModule', () => {
  let app: INestApplication;
  let caseService: CaseService;
  let case4Repository: ShardingRepositoryService<Case4>;
  let shardingManager: ShardingManager;


  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
      providers: [CaseService],
    }).compile();

    app = moduleFixture.createNestApplication();
    caseService = app.get<CaseService>(CaseService);
    const repositoryToken = `ShardingRepositoryService<Case4>`; 
    case4Repository = app.get(repositoryToken);
    shardingManager = app.get(ShardingManager);

    case4Repository.delete({});
    await app.init();
  });

  beforeEach(async () => {
    await case4Repository.delete({});
  });


  it('should ensure service is defined', async () => {
    expect(caseService).toBeDefined();
  })

  it('should ensure repository is defined', () => {
    expect(case4Repository).toBeDefined();
  });

  it('should retrieve a repository service and interact with the database', async () => {
    
    const result = await caseService.findAllCases();
    expect(result).toBeDefined();

  });

  it('should save entity in the db and be able to find it', async () => {
    const case4: Case4 = new Case4()
    case4.age = 4
    case4.firstName = 'Foo';
    case4.lastName = 'Bar';
    case4.partner = 'test';

    await caseService.saveCase(case4);

    const cases = await caseService.findAllCases();
    const count = await case4Repository.count();
    expect(cases).toBeDefined();
    expect(cases.length).toBe(1);
    expect(count).toBe(1);

  })

  it('should save entity in the correct shard, default shard if there is no matching shard', async () => {
    const case4: Case4 = new Case4()
    case4.id = 100
    case4.age = 4
    case4.firstName = 'Foo';
    case4.lastName = 'Bar';
    case4.partner = 'test';

    await caseService.saveCase(case4);


    expect((await shardingManager.getDataSourceByShardingKey('default').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBeDefined();
    expect((await shardingManager.getDataSourceByShardingKey('partner1').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
    expect((await shardingManager.getDataSourceByShardingKey('partner2').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
    expect((await shardingManager.getDataSourceByShardingKey('partner3').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);

  });

  it('should save entity in the correct shard, the matching shard', async () => {
    const matchingShardingKey = 'partner1'
    const case4: Case4 = new Case4()
    case4.id = 100
    case4.age = 4
    case4.firstName = 'Foo';
    case4.lastName = 'Bar';
    case4.partner = matchingShardingKey;

    await caseService.saveCase(case4);


    expect((await shardingManager.getDataSourceByShardingKey('default').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
    expect((await shardingManager.getDataSourceByShardingKey(matchingShardingKey).getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBeDefined();
    expect((await shardingManager.getDataSourceByShardingKey('partner2').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);
    expect((await shardingManager.getDataSourceByShardingKey('partner3').getRepository<Case4>(Case4).findOneBy({ id: case4.id }))).toBe(null);

  });

  // Additional tests...

  afterAll(async () => {
    await app.close();
  });
});
